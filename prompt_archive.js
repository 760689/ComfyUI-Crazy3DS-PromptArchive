import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";

app.registerExtension({
    name: "Crazy3DS.PromptArchive",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PromptArchiveNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                const node = this;
                
                node.properties = node.properties || {};
                node.activeTabId = node.properties.activeTabId || null;
                node.currentLib = node.properties.currentLib || null; 

                const nativeWidget = node.widgets.find(w => w.name === "text");
                if (nativeWidget) {
                    if (nativeWidget.inputEl) nativeWidget.inputEl.style.display = "none";
                    nativeWidget.computeSize = () => [0, -4];
                }

                const mainWrapper = $el("div", {
                    style: {
                        width: "100%", height: "100%", 
                        display: "flex", flexDirection: "column",
                        background: "#121212", fontFamily: "sans-serif",
                        position: "relative", overflow: "hidden", minHeight: "0" 
                    }
                });

                // ==================== 核心修复：更纯粹的官方滚轮逻辑 ====================
                
                mainWrapper.addEventListener("wheel", (e) => {
                    let isScrollableArea = false;
                    const path = e.composedPath();
                    
                    // 向上遍历DOM树
                    for (let el of path) {
                        if (el === mainWrapper) break;
                        if (el.scrollHeight > el.clientHeight) {
                            isScrollableArea = true;
                            break;
                        }
                    }

                    if (!isScrollableArea && app.canvas && app.canvas.processMouseWheel) {
                        app.canvas.processMouseWheel(e);
                        e.preventDefault();
                        e.stopPropagation();
                    } else if (isScrollableArea) {
                        e.stopPropagation();
                    }
                }, { capture: true, passive: false });

                mainWrapper.addEventListener("pointerdown", (e) => {
                    if (e.button === 1 && app.canvas && app.canvas.processMouseDown) {
                        app.canvas.processMouseDown(e);
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }, { capture: true });
                
                // =====================================================================

                const puppetInput = $el("textarea", {
                    style: {
                        flex: "0 0 130px", height: "130px",
                        width: "100%", background: "#1a1a1a", color: "#e0e0e0",
                        border: "none", padding: "2px", fontSize: "10px", 
                        fontFamily: "monospace", resize: "none", outline: "none"
                    },
                    placeholder: "Waiting for data..."
                });

                puppetInput.oninput = () => {
                    if (nativeWidget) nativeWidget.value = puppetInput.value;
                    updateCount();
                };
                puppetInput.addEventListener("mousedown", (e) => e.stopPropagation());

                const toolBar = $el("div", {
                    style: {
                        flex: "0 0 20px", height: "20px",
                        background: "#1a1a1a", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #333",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0 8px"
                    }
                });

                const charCounter = $el("div", {
                    textContent: "0 chars",
                    style: { flex: "0 0 50px", fontSize: "10px", color: "#666", fontFamily: "monospace" }
                });
                const updateCount = () => { charCounter.textContent = `${puppetInput.value.length} 字`; };

                const titleInput = $el("input", {
                    placeholder: "输入提示词标题 (可选)...",
                    style: {
                        flex: "1", margin: "0 10px", 
                        background: "transparent", border: "none", 
                        color: "#888", padding: "1px 5px", fontSize: "10px", outline: "none"
                    }
                });
                titleInput.addEventListener("mousedown", (e) => e.stopPropagation());

                const btnGroup = $el("div", { style: { flex: "0 0 auto", display: "flex", gap: "6px" } });
                const btnStyle = { background: "#333", color: "#ddd", border: "1px solid #333", borderRadius: "0px", fontSize: "10px", padding: "1px 8px", cursor: "pointer" };
                
                btnGroup.append(
                    $el("button", { textContent: "清空", style: btnStyle, onclick: () => { 
                        puppetInput.value = ""; 
                        nativeWidget.value = ""; 
                        titleInput.value = ""; 
                        updateCount(); 
                    } }),
                    $el("button", { textContent: "存入", style: {...btnStyle, background: "#264", borderColor: "#264"}, onclick: async () => {
                        if(!node.activeTabId) return;
                        await fetch("/crazy3ds_archive/save_record", { 
                            method: "POST", 
                            body: JSON.stringify({ 
                                lib_name: node.currentLib, 
                                tid: node.activeTabId, 
                                content: puppetInput.value,
                                title: titleInput.value 
                            }) 
                        });
                        refresh();
                    }})
                );
                
                toolBar.append(charCounter, titleInput, btnGroup);

                const archiveBody = $el("div", {
                    style: { flex: "1 1 0", display: "flex", flexDirection: "column", overflow: "hidden", background: "#121212", minHeight: "0" }
                });
                
                const tabBarContainer = $el("div", { 
                    style: { 
                        height: "26px", background: "#181818", borderBottom: "1px solid #222", 
                        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 
                    } 
                });
                
                const tabBar = $el("div", { 
                    style: { display: "flex", overflowX: "hidden", height: "100%", flex: "1 1 0", minWidth: "0" } 
                });
                
                // ==================== 画布原生自适应下拉组件 ====================
                let currentLibsList = [];
                const customSelect = $el("div", {
                    style: { position: "relative", display: "inline-block", userSelect: "none" }
                });

                const selectBtn = $el("div", {
                    style: {
                        background: "#222", color: "#fff", border: "1px solid #444",
                        fontSize: "11px", padding: "2px 6px", minWidth: "70px", maxWidth: "110px",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: "4px", height: "20px", boxSizing: "border-box"
                    }
                });
                const selectBtnText = $el("span", {
                    style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1" }
                });
                const selectBtnArrow = $el("span", {
                    textContent: "▾",
                    style: { fontSize: "10px", color: "#888", marginLeft: "2px", flexShrink: 0 }
                });
                selectBtn.append(selectBtnText, selectBtnArrow);

                const dropdownMenu = $el("div", {
                    style: {
                        display: "none", position: "absolute", top: "100%", left: 0,
                        marginTop: "2px", background: "#1a1a1a", border: "1px solid #444",
                        minWidth: "100%", maxHeight: "160px", overflowY: "auto",
                        zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.6)"
                    }
                });

                customSelect.append(selectBtn, dropdownMenu);

                selectBtn.addEventListener("mousedown", (e) => {
                    e.stopPropagation();
                    const isOpen = dropdownMenu.style.display === "block";
                    dropdownMenu.style.display = isOpen ? "none" : "block";
                });

                dropdownMenu.addEventListener("wheel", (e) => e.stopPropagation(), { passive: false });
                dropdownMenu.addEventListener("pointerdown", (e) => e.stopPropagation());

                document.addEventListener("pointerdown", (e) => {
                    if (!customSelect.contains(e.target)) {
                        dropdownMenu.style.display = "none";
                    }
                });

                const renderLibOptions = () => {
                    selectBtnText.textContent = (node.currentLib || "").replace(".json", "");
                    dropdownMenu.innerHTML = "";
                    currentLibsList.forEach(lib => {
                        const isCur = lib === node.currentLib;
                        const item = $el("div", {
                            textContent: lib.replace(".json", ""),
                            style: {
                                padding: "4px 8px", fontSize: "11px", color: isCur ? "#fff" : "#aaa",
                                background: isCur ? "#264" : "transparent", cursor: "pointer",
                                whiteSpace: "nowrap"
                            },
                            onmouseenter: () => { if (lib !== node.currentLib) item.style.background = "#2b2b2b"; },
                            onmouseleave: () => { if (lib !== node.currentLib) item.style.background = "transparent"; },
                            onclick: (e) => {
                                e.stopPropagation();
                                dropdownMenu.style.display = "none";
                                if (node.currentLib !== lib) {
                                    node.currentLib = lib;
                                    node.properties.currentLib = node.currentLib;
                                    node.activeTabId = null;
                                    node.properties.activeTabId = null;
                                    renderLibOptions();
                                    refresh();
                                }
                            }
                        });
                        dropdownMenu.append(item);
                    });
                };
                // ===============================================================

                const libMgrArea = $el("div", { 
                    style: { display: "flex", alignItems: "center", gap: "2px", paddingRight: "4px", flexShrink: 0 } 
                });
                const libBtnStyle = { background: "transparent", color: "#888", border: "none", cursor: "pointer", fontSize: "12px", padding: "0 4px" };
                
                libMgrArea.append(
                    customSelect,
                    $el("button", { textContent: "+", style: libBtnStyle, title: "新建文本库", onclick: async () => {
                        const newName = prompt("请输入新文本库的名称 (无需输入.json):");
                        if(newName && newName.trim()) {
                            await fetch("/crazy3ds_archive/manage_libs", { method: "POST", body: JSON.stringify({ action: "create", lib_name: newName.trim() + ".json" }) });
                            node.currentLib = newName.trim() + ".json";
                            node.properties.currentLib = node.currentLib; 
                            node.activeTabId = null;
                            node.properties.activeTabId = null; 
                            await loadLibs();
                            refresh();
                        }
                    }}),
                    $el("button", { textContent: "✏️", style: libBtnStyle, title: "重命名当前库", onclick: async () => {
                        const newName = prompt("重命名当前库为 (无需输入.json):", node.currentLib ? node.currentLib.replace(".json", "") : "");
                        if(newName && newName.trim()) {
                            await fetch("/crazy3ds_archive/manage_libs", { method: "POST", body: JSON.stringify({ action: "rename", lib_name: node.currentLib, new_name: newName.trim() + ".json" }) });
                            node.currentLib = newName.trim() + ".json";
                            node.properties.currentLib = node.currentLib; 
                            await loadLibs();
                            refresh();
                        }
                    }}),
                    $el("button", { textContent: "-", style: {...libBtnStyle, color: "#844"}, title: "删除当前库", onclick: async () => {
                        if(!node.currentLib) return;
                        if(confirm(`确定要删除文本库 [${node.currentLib}] 吗？\n（此操作不会彻底删除文件，而是将其重命名为 .bak 备份文件防止误删）`)) {
                            await fetch("/crazy3ds_archive/manage_libs", { method: "POST", body: JSON.stringify({ action: "delete", lib_name: node.currentLib }) });
                            const fallback = currentLibsList.find(o => o !== node.currentLib);
                            node.currentLib = fallback ? fallback : (currentLibsList[0] || null);
                            node.properties.currentLib = node.currentLib; 
                            node.activeTabId = null;
                            node.properties.activeTabId = null; 
                            await loadLibs();
                            refresh();
                        }
                    }})
                );
                
                tabBarContainer.append(tabBar, libMgrArea);

                const listArea = $el("div", { 
                    style: { flexGrow: "1", overflowY: "auto", background: "#121212", minHeight: "0" } 
                });

                archiveBody.append(tabBarContainer, listArea);
                mainWrapper.append(puppetInput, toolBar, archiveBody);
                node.addDOMWidget("archive_v53_ui", "HTML", mainWrapper);

                api.addEventListener("crazy3ds.prompt_archive.sync_data", (event) => {
                    if (event.detail.node_id == node.id) {
                        const txt = event.detail.text;
                        puppetInput.value = txt;
                        if (nativeWidget) nativeWidget.value = txt;
                        updateCount();
                    }
                });

                node.onConfigure = function() {
                    if (nativeWidget && nativeWidget.value) {
                        puppetInput.value = nativeWidget.value;
                        updateCount();
                    }
                    if (node.properties.currentLib) node.currentLib = node.properties.currentLib;
                    if (node.properties.activeTabId) node.activeTabId = node.properties.activeTabId;

                    loadLibs().then(refresh);
                };

                const showOverlay = (content) => {
                    const overlay = $el("div", { style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", justifyContent: "center", alignItems: "center" } });
                    overlay.append(content); mainWrapper.append(overlay);
                    return () => overlay.remove();
                };
                
                const loadLibs = async () => {
                    try {
                        const res = await fetch("/crazy3ds_archive/get_libs");
                        const libs = await res.json();
                        currentLibsList = libs;
                        if ((!node.currentLib || !libs.includes(node.currentLib)) && libs.length > 0) {
                            node.currentLib = libs[0];
                            node.properties.currentLib = node.currentLib;
                        }
                        renderLibOptions();
                    } catch(e) { console.error("库列表加载异常", e); }
                };

                const refresh = async () => {
                    try {
                        const res = await fetch("/crazy3ds_archive/get_data", {
                            method: "POST",
                            body: JSON.stringify({ lib_name: node.currentLib })
                        });
                        const data = await res.json();
                        if (!data.tabs) return;
                        if (!node.activeTabId || !data.tabs.find(t => t.id === node.activeTabId)) node.activeTabId = data.tabs[0]?.id || "t1";

                        tabBar.innerHTML = "";
                        data.tabs.forEach(t => {
                            const active = t.id === node.activeTabId;
                            const tab = $el("div", {
                                style: { padding: "0 10px", height: "100%", display: "flex", alignItems: "center", fontSize: "11px", cursor: "pointer", color: active ? "#fff" : "#666", background: active ? "#222" : "transparent", borderRight: "1px solid #222", whiteSpace: "nowrap", flexShrink: 0 },
                                onclick: () => { 
                                    node.activeTabId = t.id; 
                                    node.properties.activeTabId = t.id; 
                                    refresh(); 
                                },
                                ondblclick: (e) => {
                                    e.stopPropagation();
                                    const box = $el("div", { style: { display:"flex", flexDirection:"column", gap:"8px", background:"#333", padding:"12px", border:"1px solid #555", borderRadius:"4px" }});
                                    const inp = $el("input", { value: t.name, style: { background:"#111", color:"#fff", border:"1px solid #444", padding:"4px" } });
                                    const close = showOverlay(box);
                                    box.append(inp, $el("button", { textContent: "确定", onclick: async () => { await fetch("/crazy3ds_archive/manage_tabs", { method: "POST", body: JSON.stringify({ lib_name: node.currentLib, action: "rename", tid: t.id, name: inp.value }) }); refresh(); close(); } }));
                                }
                            }, [$el("span", { textContent: t.name })]);
                            
                            if (data.tabs.length > 1) {
                                tab.append($el("span", { textContent: "×", style: { marginLeft: "5px", color: "#844" }, onclick: async (e) => {
                                    e.stopPropagation();
                                    const box = $el("div", { style: { background:"#322", padding:"15px", border:"1px solid #633", borderRadius:"4px", display:"flex", flexDirection:"column", gap:"10px", minWidth:"150px" }});
                                    box.innerHTML = `<div style="font-size:12px; color:#ddd; text-align:center;">确认删除分类<br><b style="color:#fff">${t.name}</b> ?</div>`;
                                    const close = showOverlay(box);
                                    const btnArea = $el("div", { style: { display: "flex", gap: "10px", justifyContent: "center" } });
                                    const cancelBtn = $el("button", { textContent: "取消", style: { background: "#444", color: "#fff", border: "none", padding: "4px 10px", cursor: "pointer" }, onclick: close });
                                    const delBtn = $el("button", { textContent: "删除", style: { background: "#a33", color: "#fff", border: "none", padding: "4px 10px", cursor: "pointer" }, onclick: async () => { await fetch("/crazy3ds_archive/manage_tabs", { method: "POST", body: JSON.stringify({ lib_name: node.currentLib, action: "delete_tab", tid: t.id }) }); refresh(); close(); } });
                                    btnArea.append(cancelBtn, delBtn); box.append(btnArea);
                                }}));
                            }
                            tabBar.append(tab);
                        });
                        tabBar.append($el("div", { textContent: "+", style: { width: "30px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", fontSize: "17px", paddingBottom: "2px", flexShrink: 0 }, onclick: async () => { await fetch("/crazy3ds_archive/manage_tabs", { method: "POST", body: JSON.stringify({ lib_name: node.currentLib, action: "create" }) }); refresh(); } }));

                        listArea.innerHTML = "";
                        (data.records[node.activeTabId] || []).forEach(rec => {
                            const row = $el("div", { 
                                title: rec.title ? rec.title : "", 
                                style: { 
                                    borderBottom: "1px solid #222", padding: "2px", display: "flex", 
                                    alignItems: "flex-start", background: "#121212" 
                                } 
                            });

                            const displayContent = rec.title ? `[${rec.title}] ${rec.content}` : rec.content;

                            const contentDiv = $el("div", { 
                                textContent: displayContent, 
                                style: { 
                                    flex: "1", fontSize: "9px", color: "#aaa", lineHeight: "1.4",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", 
                                    cursor: "pointer", paddingRight: "5px"
                                }, 
                                onclick: (e) => e.target.style.whiteSpace = e.target.style.whiteSpace==="nowrap"?"pre-wrap":"nowrap" 
                            });

                            const rightCol = $el("div", {
                                style: {
                                    display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px",
                                    flex: "0 0 50px" 
                                }
                            });

                            const btnRow = $el("div", { style: { display: "flex", gap: "2px" } });
                            btnRow.append(
                                $el("button", { textContent: "载入", style: { background: "#222", border: "1px solid #222", color: "#888", cursor: "pointer", fontSize: "8px", padding: "1px 3px" }, onclick: () => { 
                                    puppetInput.value = rec.content; 
                                    nativeWidget.value = rec.content; 
                                    titleInput.value = rec.title || ""; 
                                    updateCount(); 
                                } }),
                                $el("button", { textContent: "×", style: { background: "#222", border: "1px solid #222", color: "#844", cursor: "pointer", fontSize: "9px", padding: "1px 3px" }, onclick: async () => { await fetch("/crazy3ds_archive/manage_tabs", { method: "POST", body: JSON.stringify({ lib_name: node.currentLib, action: "delete_record", tid: node.activeTabId, rid: rec.id }) }); refresh(); } })
                            );

                            const timeRow = $el("div", { 
                                textContent: rec.time || "", 
                                style: { fontSize: "7px", color: "#444", fontFamily: "monospace", marginTop: "2px" } 
                            });

                            rightCol.append(btnRow, timeRow);
                            row.append(contentDiv, rightCol);
                            listArea.append(row);
                        });
                    } catch(e) {}
                };

                if (node.size[0] < 100) node.setSize([400, 600]);
                loadLibs().then(() => {
                    setTimeout(refresh, 200);
                });
            };
        }
    }
});