import os
import glob
import torch
import numpy as np
import json
from PIL import Image, ImageOps, ImageSequence
import folder_paths
from server import PromptServer
from aiohttp import web
import node_helpers
import safetensors.torch

NODE_ROOT = os.path.dirname(os.path.realpath(__file__))
DEFAULT_ASSETS = os.path.join(NODE_ROOT, "assets", "gallery")

if not os.path.exists(DEFAULT_ASSETS):
    os.makedirs(DEFAULT_ASSETS, exist_ok=True)

def clean_metadata_value(val):
    """Safely unwraps double-serialized strings, arrays, numbers, and nested dicts."""
    if isinstance(val, str):
        val_stripped = val.strip()
        if (val_stripped.startswith("[") and val_stripped.endswith("]")) or \
           (val_stripped.startswith("{") and val_stripped.endswith("}")):
            try:
                return clean_metadata_value(json.loads(val_stripped))
            except:
                pass
        
        if val_stripped.startswith('"') and val_stripped.endswith('"'):
            try:
                return clean_metadata_value(json.loads(val_stripped))
            except:
                return val_stripped[1:-1]
        
        if val_stripped.isdigit():
            return int(val_stripped)
            
    elif isinstance(val, list):
        return [clean_metadata_value(item) for item in val]
    elif isinstance(val, dict):
        return {k: clean_metadata_value(v) for k, v in val.items()}
        
    return val

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

    RETURN_TYPES = ("IMAGE", "LATENT", "STRING", "STRING", "DICT")
    RETURN_NAMES = ("images", "latents", "filenames", "extensions", "extra_metadata")
    OUTPUT_IS_LIST = (True, True, True, True, True)
    FUNCTION = "main_process"
    CATEGORY = "Utils"
    OUTPUT_NODE = True

    def main_process(self, selected_image, sort_method, image_picker_ui, folder_path=DEFAULT_ASSETS, opt_folder_path=None):
        active_path = opt_folder_path if opt_folder_path is not None else folder_path
        if not active_path or not os.path.exists(active_path):
            active_path = DEFAULT_ASSETS

        selected_files = [f.strip() for f in selected_image.split("|||") if f.strip()]

        image_list = []
        latent_list = []
        name_list = []
        ext_list = []
        dict_list = []

        if not selected_files:
            return (image_list, latent_list, name_list, ext_list, dict_list)

        for file_name in selected_files:
            image_path = os.path.join(active_path, file_name)
            if not os.path.exists(image_path):
                continue
            
            img = node_helpers.pillow(Image.open, image_path)
            base_name, ext = os.path.splitext(file_name)
            
            meta_dict = {}
            
            raw_pnginfo = img.info.get("extra_pnginfo", {})
            if isinstance(raw_pnginfo, str):
                try:
                    raw_pnginfo = json.loads(raw_pnginfo)
                except json.JSONDecodeError:
                    raw_pnginfo = {}

            if isinstance(raw_pnginfo, dict):
                meta_dict = {k: v for k, v in raw_pnginfo.items() if k not in ("workflow", "prompt")}

            if not meta_dict:
                meta_dict = {k: v for k, v in img.info.items() if k not in ("workflow", "prompt", "extra_pnginfo")}

            if len(meta_dict) == 1 and "value" in meta_dict:
                try:
                    meta_dict = json.loads(meta_dict["value"])
                except:
                    pass
            elif "metadata_extra" in meta_dict:
                try:
                    meta_dict = json.loads(meta_dict["metadata_extra"]) if isinstance(meta_dict["metadata_extra"], str) else meta_dict["metadata_extra"]
                except:
                    pass

            meta_dict = clean_metadata_value(meta_dict)

            # --- PREFIX-MAPPED LATENT LOADING SECTION ---
            latent_path = os.path.join(active_path, f"latent_{base_name}.latent")
            latent_data = None

            print(f"[VisualImagePicker] Checking for prefix-mapped latent file at: {latent_path}")

            if os.path.exists(latent_path):
                import gzip
                import io
                import pickle
                import safetensors.torch

                # Strategy 1: Modern ComfyUI Safetensors Format
                try:
                    safetensor_data = safetensors.torch.load_file(latent_path, device="cpu")
                    print(f"[VisualImagePicker] Successfully loaded as Safetensors file. Keys found: {list(safetensor_data.keys())}")
                    
                    target_tensor = None
                    if "samples" in safetensor_data:
                        target_tensor = safetensor_data["samples"]
                    elif "latent_tensor" in safetensor_data:
                        target_tensor = safetensor_data["latent_tensor"]
                    elif len(safetensor_data) > 0:
                        biggest_key = max(safetensor_data.keys(), key=lambda k: safetensor_data[k].numel())
                        target_tensor = safetensor_data[biggest_key]

                    if target_tensor is not None:
                        if len(target_tensor.shape) == 1 or target_tensor.numel() == 0:
                            print(f"[VisualImagePicker] WARNING: Target tensor is flat or empty. Shape: {target_tensor.shape}")
                            target_tensor = None
                        else:
                            latent_data = {"samples": target_tensor}
                            
                except Exception as sf_e:
                    print(f"[VisualImagePicker] Safetensors parsing bypassed/failed: {sf_e}")
                    latent_data = None

                # Strategy 2: Raw Pickle Deserialization Fallback
                if latent_data is None:
                    try:
                        with open(latent_path, 'rb') as f:
                            raw_load = pickle.load(f)
                        print(f"[VisualImagePicker] Successfully loaded raw Pickle data.")
                        if isinstance(raw_load, dict):
                            for k in raw_load:
                                if isinstance(raw_load[k], torch.Tensor):
                                    raw_load[k] = raw_load[k].to("cpu")
                    except Exception as pickle_e:
                        print(f"[VisualImagePicker] Direct pickle load failed: {pickle_e}")
                        raw_load = None

                # Strategy 3: Gzip Compressed Fallback
                if latent_data is None and raw_load is None:
                    try:
                        with gzip.open(latent_path, 'rb') as f:
                            with io.BytesIO(f.read()) as bytes_io:
                                raw_load = torch.load(bytes_io, map_location="cpu", weights_only=False)
                        print(f"[VisualImagePicker] Successfully decompressed Gzip latent.")
                    except Exception as gzip_e:
                        print(f"[VisualImagePicker] Gzip decompression failed: {gzip_e}")
                        raw_load = None

                # Strategy 4: Standard Torch Load Fallback
                if latent_data is None and raw_load is None:
                    try:
                        raw_load = torch.load(latent_path, map_location="cpu", weights_only=False)
                        print(f"[VisualImagePicker] Loaded via standard torch.load fallback.")
                    except Exception as torch_e:
                        print(f"[VisualImagePicker] All loading strategies exhausted: {torch_e}")
                        raw_load = None

                # Process raw weights if parsed via pickling/torch strategies
                if latent_data is None and raw_load is not None:
                    if isinstance(raw_load, dict):
                        if "samples" in raw_load:
                            latent_data = {"samples": raw_load["samples"]}
                        elif "latent_tensor" in raw_load:
                            latent_data = {"samples": raw_load["latent_tensor"]}
                    elif isinstance(raw_load, torch.Tensor):
                        latent_data = {"samples": raw_load}

                if latent_data is not None and len(latent_data['samples'].shape) > 1:
                    print(f"[VisualImagePicker] Latent tensor verified successfully. Shape: {latent_data['samples'].shape}")
                else:
                    latent_data = None

            if latent_data is None:
                print(f"[VisualImagePicker] WARNING: No matching or valid 4D latent resolved. Generating placeholder tensor.")
                latent_data = {"samples": torch.zeros([1, 4, 64, 64], dtype=torch.float32)}

            frames = []
            for frame in ImageSequence.Iterator(img):
                frame = node_helpers.pillow(ImageOps.exif_transpose, frame).convert("RGB")
                tensor = torch.from_numpy(np.array(frame).astype(np.float32) / 255.0)[None,]
                frames.append(tensor)
            
            if frames:
                image_list.append(torch.cat(frames, dim=0))
                latent_list.append(latent_data)
                name_list.append(base_name)
                ext_list.append(ext.lstrip('.'))
                dict_list.append(meta_dict)

        return (image_list, latent_list, name_list, ext_list, dict_list)