import os
from server import PromptServer
from aiohttp import web

@PromptServer.instance.routes.post("/visual_picker/folders")
async def get_folders(request):
    body = await request.json()
    base_path = body.get("folder_path", "")
    abs_path = os.path.abspath(base_path)

    if not os.path.isdir(abs_path):
        return web.json_response({"error": "Invalid Path ⛔"}, status=404)

    try:
        folders = [f.name for f in os.scandir(abs_path) if f.is_dir()]
        folders.sort(key=lambda x: x.lower())
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
                "folder_picker_ui": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("full_path", "folder_name")
    FUNCTION = "main_process"
    CATEGORY = "Utils"
    OUTPUT_NODE = True
    DESCRIPTION = "Provides a visual interface to browse and select subfolders within a directory, returning both the absolute path and the specific folder name."
    
    def main_process(self, folder_path, folder_picker_ui, selected_folder):
        full_path = os.path.abspath(folder_path)
        folder_name = os.path.basename(full_path)
        return (full_path, folder_name)