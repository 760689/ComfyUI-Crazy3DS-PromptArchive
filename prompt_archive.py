import os, json, time, uuid, shutil
from server import PromptServer
from aiohttp import web

# 动态获取当前节点目录及 CIKU 目录
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CIKU_DIR = os.path.join(CURRENT_DIR, "CIKU")
os.makedirs(CIKU_DIR, exist_ok=True)
DEFAULT_LIB = "Project.json"

def get_existing_libs():
    """获取所有现存词库文件"""
    return [f for f in os.listdir(CIKU_DIR) if f.endswith('.json')]

def get_fallback_lib():
    """动态获取默认库：优先取现存的第一个库，纯空时才回退至 Project.json"""
    libs = get_existing_libs()
    return libs[0] if libs else DEFAULT_LIB

def _ensure_ciku_ready():
    # 自动将根目录下遗留的库文件与备份文件迁移至 CIKU 目录
    for f in os.listdir(CURRENT_DIR):
        if (f.endswith('.json') or f.endswith('.json.bak')) and os.path.isfile(os.path.join(CURRENT_DIR, f)):
            src = os.path.join(CURRENT_DIR, f)
            dst = os.path.join(CIKU_DIR, f)
            if not os.path.exists(dst):
                try:
                    shutil.move(src, dst)
                except Exception:
                    pass

    # 仅当 CIKU 目录下没有任何库文件时，才自动生成出厂默认库
    if not get_existing_libs():
        default_path = os.path.join(CIKU_DIR, DEFAULT_LIB)
        default_data = { "tabs": [ {"id": "t1", "name": "默认分类"} ], "records": {"t1": []} }
        with open(default_path, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=4)

_ensure_ciku_ready()

class PromptArchiveNode:
    def __init__(self):
        # 实例化时不强制新建 Project.json，只确保目录健康
        _ensure_ciku_ready()

    def _init_db(self, filename):
        db_path = os.path.join(CIKU_DIR, filename)
        if not os.path.exists(db_path):
            default_data = { "tabs": [ {"id": "t1", "name": "默认分类"} ], "records": {"t1": []} }
            with open(db_path, 'w', encoding='utf-8') as f:
                json.dump(default_data, f, ensure_ascii=False, indent=4)

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "text": ("STRING", {"multiline": True, "default": "", "dynamicPrompts": False}),
            },
            "optional": { "incoming_text": ("STRING", {"forceInput": True}), },
            "hidden": { "unique_id": "UNIQUE_ID" }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "execute"
    CATEGORY = "Archive"

    def execute(self, text="", incoming_text=None, unique_id=None):
        final_text = ""
        if incoming_text is not None:
            if isinstance(incoming_text, list):
                if len(incoming_text) == 1:
                    final_text = str(incoming_text[0])
                else:
                    final_text = "\n".join([str(x) for x in incoming_text])
            else:
                final_text = str(incoming_text)
        else:
            final_text = text

        PromptServer.instance.send_sync("crazy3ds.prompt_archive.sync_data", {
            "node_id": str(unique_id),
            "text": final_text
        })
        return (final_text,)

# --- API ---
def get_db_path(filename):
    if not filename:
        filename = get_fallback_lib()
    safe_name = os.path.basename(filename)
    if not safe_name.endswith('.json'):
        safe_name += '.json'
    return os.path.join(CIKU_DIR, safe_name)

@PromptServer.instance.routes.get("/crazy3ds_archive/get_libs")
async def get_libs(request):
    files = get_existing_libs()
    if not files:
        _ensure_ciku_ready()
        files = get_existing_libs()
    return web.json_response(list(set(files)))

@PromptServer.instance.routes.post("/crazy3ds_archive/manage_libs")
async def manage_libs(request):
    json_data = await request.json()
    action = json_data.get("action")
    lib_name = json_data.get("lib_name")
    
    if action == "create":
        path = get_db_path(lib_name)
        if not os.path.exists(path):
            save_json(path, { "tabs": [ {"id": "t1", "name": "默认分类"} ], "records": {"t1": []} })
    elif action == "rename":
        new_name = json_data.get("new_name")
        old_path = get_db_path(lib_name)
        new_path = get_db_path(new_name)
        if os.path.exists(old_path) and not os.path.exists(new_path):
            os.rename(old_path, new_path)
    elif action == "delete":
        path = get_db_path(lib_name)
        if not os.path.exists(path):
            root_fallback = os.path.join(CURRENT_DIR, os.path.basename(path))
            if os.path.exists(root_fallback):
                path = root_fallback
        if os.path.exists(path):
            bak_path = path + ".bak"
            if os.path.exists(bak_path):
                try:
                    os.remove(bak_path)
                except Exception:
                    pass
            os.rename(path, bak_path)
    return web.json_response({"status": "ok"})

@PromptServer.instance.routes.post("/crazy3ds_archive/get_data")
async def get_data(request):
    json_data = await request.json()
    lib_name = json_data.get("lib_name") or get_fallback_lib()
    return web.json_response(load_json(get_db_path(lib_name)))

@PromptServer.instance.routes.post("/crazy3ds_archive/save_record")
async def save_record(request):
    json_data = await request.json()
    lib_name = json_data.get("lib_name") or get_fallback_lib()
    tid = json_data.get("tid")
    content = json_data.get("content")
    title = json_data.get("title", "")
    
    p = get_db_path(lib_name)
    data = load_json(p)
    if tid not in data["records"]: data["records"][tid] = []
    if content and content.strip():
        data["records"][tid].insert(0, { "id": str(int(time.time()*1000)), "time": time.strftime("%m-%d %H:%M"), "title": title, "content": content })
        save_json(p, data)
    return web.json_response({"status": "ok"})

@PromptServer.instance.routes.post("/crazy3ds_archive/manage_tabs")
async def manage_tabs(request):
    json_data = await request.json()
    lib_name = json_data.get("lib_name") or get_fallback_lib()
    action, tid = json_data.get("action"), json_data.get("tid")
    
    p = get_db_path(lib_name)
    data = load_json(p)
    if action == "create":
        new_id = str(uuid.uuid4())[:8]
        data["tabs"].append({"id": new_id, "name": f"分类_{int(time.time())%100}"})
        data["records"][new_id] = []
    elif action == "rename":
        for t in data["tabs"]:
            if t["id"] == tid: t["name"] = json_data.get("name").strip()
    elif action == "delete_tab":
        data["tabs"] = [t for t in data["tabs"] if t["id"] != tid]
        if tid in data["records"]: del data["records"][tid]
    elif action == "delete_record":
        rid = json_data.get("rid")
        if tid in data["records"]: data["records"][tid] = [r for r in data["records"][tid] if r["id"] != rid]
    save_json(p, data)
    return web.json_response({"status": "ok"})

def load_json(p):
    try:
        with open(p, 'r', encoding='utf-8') as f: return json.load(f)
    except: return {"tabs":[], "records":{}}
def save_json(p, d):
    with open(p, 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, indent=4)