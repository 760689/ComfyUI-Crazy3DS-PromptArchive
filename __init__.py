from .prompt_archive import PromptArchiveNode

NODE_CLASS_MAPPINGS = { "PromptArchiveNode": PromptArchiveNode }
NODE_DISPLAY_NAME_MAPPINGS = { "PromptArchiveNode": "提示词仓库-疯狂的3DS" }
WEB_DIRECTORY = "./"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]