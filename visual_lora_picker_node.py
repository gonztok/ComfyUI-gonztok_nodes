import os
import glob
import folder_paths
import urllib.parse
from server import PromptServer
from aiohttp import web

NODE_ROOT = os.path.dirname(os.path.realpath(__file__))

class AlwaysEqualProxy(str):
    def __eq__(self, _): return True
    def __ne__(self, _): return False

@PromptServer.instance.routes.post("/visual_picker/loras")
async def get_loras(request):
    body = await request.json()
    folder_path = body.get("folder_path", "")
    sort_method = body.get("sort_method", "newest_first")
    
    if not folder_path or not os.path.isdir(folder_path):
        return web.json_response({})

    files = glob.glob(os.path.join(folder_path, "*.safetensors"))
    
    sort_keys = {
        "name_asc": lambda x: os.path.basename(x).lower(),
        "name_desc": lambda x: os.path.basename(x).lower(),
        "newest_first": lambda x: os.path.getctime(x),
        "oldest_first": lambda x: os.path.getctime(x),
        "recently_modified": lambda x: os.path.getmtime(x),
        "oldest_modified": lambda x: os.path.getmtime(x)
    }

    reverse = "desc" in sort_method or "newest" in sort_method or "recently" in sort_method
    files.sort(key=sort_keys.get(sort_method, sort_keys["newest_first"]), reverse=reverse)

    img_extensions = [".webp", ".jpg", ".jpeg", ".png", ".gif"]

    result = {}
    for f in files:
        basename = os.path.basename(f)
        name_no_ext = os.path.splitext(basename)[0]
        
        preview_file = None
        for ext in img_extensions:
            potential_img = os.path.join(folder_path, name_no_ext + ext)
            if os.path.exists(potential_img):
                preview_file = name_no_ext + ext
                break
        
        if not preview_file:
            preview_file = name_no_ext + ".webp"
        
        result[basename] = {
            "filename": basename,
            "preview_url": f"/visual_picker/view_lora?folder_path={urllib.parse.quote(folder_path)}&filename={urllib.parse.quote(preview_file)}"
        }

    return web.json_response(result)

@PromptServer.instance.routes.get("/visual_picker/view_lora")
async def view_preview(request):
    folder_path = request.query.get("folder_path")
    filename = request.query.get("filename")
    no_preview = os.path.join(NODE_ROOT, "assets", "no-preview.jpg")

    if not filename or not folder_path:
        return web.FileResponse(no_preview) if os.path.exists(no_preview) else web.Response(status=404)
    
    image_path = os.path.abspath(os.path.join(folder_path, filename))
    if os.path.exists(image_path):
        return web.FileResponse(image_path)
    return web.FileResponse(no_preview)

@PromptServer.instance.routes.get("/visual_picker/no-selection")
async def get_no_selection(request):
    path = os.path.join(NODE_ROOT, "assets", "no-selection.jpg")
    return web.FileResponse(path) if os.path.exists(path) else web.Response(status=404)

class VisualLoraPicker:
    @classmethod
    def INPUT_TYPES(s):
        default_path = folder_paths.get_folder_paths("loras")[0] if "loras" in folder_paths.folder_names_and_paths else ""
        return {
            "required": {
                "folder_path": ("STRING", {"default": default_path}),
                "selected_lora": ("STRING", {"default": ""}),
                "sort_method": (["name_asc", "name_desc", "newest_first", "oldest_first", "recently_modified", "oldest_modified"], {"default": "newest_first"}),
            },
            "optional": {
                "opt_folder_path": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = (AlwaysEqualProxy('*'), "STRING")
    RETURN_NAMES = ("full_lora_name", "lora_name")
    FUNCTION = "process"
    CATEGORY = "Utils"
    OUTPUT_NODE = True

    def process(self, folder_path, selected_lora, sort_method, opt_folder_path=None):
        final_path = opt_folder_path if opt_folder_path is not None else folder_path
        
        if not selected_lora: 
            return ("", "")
            
        absolute_file_path = os.path.normpath(os.path.join(final_path, selected_lora))
        
        lora_roots = folder_paths.get_folder_paths("loras")
        
        relative_path = selected_lora
        
        for root in lora_roots:
            abs_root = os.path.abspath(root)
            if absolute_file_path.lower().startswith(abs_root.lower()):
                relative_path = os.path.relpath(absolute_file_path, abs_root)
                break
        
        relative_path = relative_path.replace("\\", "/")
                
        return (relative_path, os.path.splitext(selected_lora)[0])