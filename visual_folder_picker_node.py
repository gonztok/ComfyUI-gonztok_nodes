import os
from server import PromptServer
from aiohttp import web

@PromptServer.instance.routes.post("/visual_picker/folders")
async def get_folders(request):
    body = await request.json()
    base_path = body.get("folder_path", "")
    sort_method = body.get("sort_method", "newest_first")
    abs_path = os.path.abspath(base_path)

    if not os.path.isdir(abs_path):
        return web.json_response({"error": "Invalid Path ⛔"}, status=404)

    sort_keys = {
        "name_asc": lambda x: x.lower(),
        "name_desc": lambda x: x.lower(),
        "newest_first": lambda x: os.path.getctime(os.path.join(abs_path, x)),
        "oldest_first": lambda x: os.path.getctime(os.path.join(abs_path, x)),
        "recently_modified": lambda x: os.path.getmtime(os.path.join(abs_path, x)),
        "oldest_modified": lambda x: os.path.getmtime(os.path.join(abs_path, x))
    }
    reverse = "desc" in sort_method or "newest" in sort_method or "recently" in sort_method

    try:
        folders = [f.name for f in os.scandir(abs_path) if f.is_dir()]
        folders.sort(key=sort_keys.get(sort_method, sort_keys["newest_first"]), reverse=reverse)
        return web.json_response({"folders": folders, "current_path": abs_path})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

class VisualFolderPicker:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "./input"}),
                "selected_folder": ("STRING", {"default": ""}),
                "sort_method": (["name_asc", "name_desc", "newest_first", "oldest_first", "recently_modified", "oldest_modified"], {"default": "newest_first"}),
                "folder_picker_ui": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("full_path", "folder_name")
    FUNCTION = "main_process"
    CATEGORY = "Utils"
    OUTPUT_NODE = True
    DESCRIPTION = "Provides a visual interface to browse and select subfolders within a directory, returning both the absolute path and the specific folder name."
    
    def main_process(self, folder_path, folder_picker_ui, selected_folder, sort_method):
        full_path = os.path.abspath(folder_path)
        folder_name = os.path.basename(full_path)
        return (full_path, folder_name)