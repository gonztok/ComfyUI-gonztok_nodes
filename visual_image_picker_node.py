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
    if not os.path.isdir(folder_path): return web.json_response({})
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

# --- Node Class ---

class VisualImagePicker:
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "selected_image": ("STRING", {"default": ""}),
                "sort_method": (["name_asc", "name_desc", "newest_first", "oldest_first", "recently_modified", "oldest_modified"], {"default": "newest_first"}),
            },
            "optional": {
                "folder_path": ("STRING", {"default": DEFAULT_ASSETS}),
                "opt_folder_path": ("STRING", {"forceInput": True}),
            }
        }

    RETURN_TYPES = ("IMAGE", "STRING", "STRING")
    RETURN_NAMES = ("image", "filename", "extension")
    FUNCTION = "main_process"
    CATEGORY = "Utils"
    OUTPUT_NODE = True

    def main_process(self, selected_image, sort_method, folder_path=DEFAULT_ASSETS, opt_folder_path=None):
        active_path = opt_folder_path if opt_folder_path is not None else folder_path
        
        if not active_path or not os.path.exists(active_path):
            active_path = DEFAULT_ASSETS

        if not selected_image or not selected_image.strip():
            files = [f for f in glob.glob(os.path.join(active_path, "*.*")) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))]
            if not files: raise ValueError(f"Directory {active_path} is empty or contains no valid images")
            selected_image = os.path.basename(max(files, key=os.path.getctime))

        image_path = os.path.join(active_path, selected_image)
        
        if not os.path.exists(image_path):
            files = [f for f in glob.glob(os.path.join(active_path, "*.*")) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp'))]
            if files:
                image_path = max(files, key=os.path.getctime)
                selected_image = os.path.basename(image_path)
            else:
                raise ValueError(f"Image not found: {selected_image}")

        img = node_helpers.pillow(Image.open, image_path)
        file_name_no_ext, file_extension = os.path.splitext(selected_image)
        file_extension = file_extension.lstrip('.')

        output_images = []
        for frame in ImageSequence.Iterator(img):
            frame = node_helpers.pillow(ImageOps.exif_transpose, frame).convert("RGB")
            tensor = torch.from_numpy(np.array(frame).astype(np.float32) / 255.0)[None,]
            output_images.append(tensor)

        return (torch.cat(output_images, dim=0), file_name_no_ext, file_extension)