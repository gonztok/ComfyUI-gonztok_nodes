import os
import glob
import torch
import numpy as np
from PIL import Image, ImageOps, ImageSequence
import folder_paths
from server import PromptServer
from aiohttp import web
import node_helpers

NODE_ROOT = os.path.dirname(os.path.realpath(__file__))
DEFAULT_ASSETS = os.path.join(NODE_ROOT, "assets", "gallery")

if not os.path.exists(DEFAULT_ASSETS):
    os.makedirs(DEFAULT_ASSETS, exist_ok=True)

@PromptServer.instance.routes.post("/visual_picker/images")
async def get_images(request):
    body = await request.json()
    folder_path = body.get("folder_path", DEFAULT_ASSETS)
    sort_method = body.get("sort_method", "newest_first")
    if not os.path.isdir(folder_path): 
        return web.Response(status=404, text="Directory not found")
    extensions = ["*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp"]
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(folder_path, ext)))
        files.extend(glob.glob(os.path.join(folder_path, ext.upper())))
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
    return web.json_response({os.path.basename(f): os.path.basename(f) for f in files})

@PromptServer.instance.routes.get("/visual_picker/view")
async def view_image(request):
    folder_path = request.query.get("folder_path", DEFAULT_ASSETS)
    filename = request.query.get("filename")
    if not filename or not os.path.exists(folder_path): return web.Response(status=404)
    image_path = os.path.abspath(os.path.join(folder_path, filename))
    if not os.path.commonpath([os.path.abspath(folder_path), image_path]) == os.path.abspath(folder_path):
        return web.Response(status=403)
    return web.FileResponse(image_path)

@PromptServer.instance.routes.get("/visual_picker/no-selection")
async def get_placeholder(request):
    placeholder_path = os.path.join(NODE_ROOT, "assets", "no-selection.jpg")
    if os.path.exists(placeholder_path): return web.FileResponse(placeholder_path)
    return web.Response(status=404)

class VisualImagePicker:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "folder_path": ("STRING", {"default": DEFAULT_ASSETS}),
                "selected_image": ("STRING", {"default": ""}),
                "sort_method": (["name_asc", "name_desc", "newest_first", "oldest_first", "recently_modified", "oldest_modified"], {"default": "newest_first"}),
                "image_picker_ui": ("STRING", {"default": ""}),
            },
            "optional": {
                "opt_folder_path": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING", "STRING")
    RETURN_NAMES = ("images", "filenames", "extensions")
    OUTPUT_IS_LIST = (True, True, True)
    FUNCTION = "main_process"
    CATEGORY = "Utils"
    OUTPUT_NODE = True

    def main_process(self, selected_image, sort_method, image_picker_ui, folder_path=DEFAULT_ASSETS, opt_folder_path=None):
        active_path = opt_folder_path if opt_folder_path is not None else folder_path
        if not active_path or not os.path.exists(active_path):
            active_path = DEFAULT_ASSETS

        selected_files = [f.strip() for f in selected_image.split("|||") if f.strip()]

        image_list = []
        name_list = []
        ext_list = []

        if not selected_files:
            return (image_list, name_list, ext_list)

        for file_name in selected_files:
            image_path = os.path.join(active_path, file_name)
            if not os.path.exists(image_path):
                continue
            
            img = node_helpers.pillow(Image.open, image_path)
            base_name, ext = os.path.splitext(file_name)
            
            frames = []
            for frame in ImageSequence.Iterator(img):
                frame = node_helpers.pillow(ImageOps.exif_transpose, frame).convert("RGB")
                tensor = torch.from_numpy(np.array(frame).astype(np.float32) / 255.0)[None,]
                frames.append(tensor)
            
            if frames:
                image_list.append(torch.cat(frames, dim=0))
                name_list.append(base_name)
                ext_list.append(ext.lstrip('.'))

        # Instead of raising ValueError, we return the empty lists gracefully.
        # This prevents ComfyUI from crashing when no image is selected.
        return (image_list, name_list, ext_list)