"""Extract map-relevant Valheim assets from the Unity SoftRef bundles.

Usage: source activate.sh && python scripts/extract_assets.py [out_dir]
"""
import json, os, re, sys
from collections import defaultdict
from pathlib import Path
import UnityPy

DATA = Path(os.environ["VALHEIM_DATA"])
SOFTREF = DATA / "StreamingAssets" / "SoftRef"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "out/assets")

# Asset path prefixes / exact paths to pull.
TARGET_PREFIXES = [
    "Assets/UI/map/",
    "Assets/UI/prefabs/IngameGui/IngameGui_HUD_Minimap.prefab",
    "Assets/UI/animations/minimap_",
    "Assets/3rd party/TextMesh Pro/Resources/Fonts/Norse/",
    "Assets/3rd party/TextMesh Pro/Resources/Fonts/Averia_Serif_Libre/",
    "Assets/3rd party/TextMesh Pro/Resources/Fonts/Averia_Sans_Libre/",
    "Assets/3rd party/TextMesh Pro/Resources/Fonts/Rune/",
    "Assets/Shaders/mapshader.shader",
    "Assets/Shaders/Heightmap.shader",
    "Assets/Shaders/Water.shader",
    "Assets/Shaders/WaterMask.shader",
    "Assets/Effects/textures/flatten_terrain.png",
]

def wanted(path: str) -> bool:
    return any(path.startswith(p) for p in TARGET_PREFIXES)

# --- parse manifest_extended: "- asset ID: x / bundle: y / path in bundle: z"
path_to_bundle = {}
text = (SOFTREF / "manifest_extended").read_text(errors="replace")
for m in re.finditer(r"bundle: (\S+)\n\s+path in bundle: (.+)", text):
    path_to_bundle[m.group(2).strip()] = m.group(1)

targets = {p: b for p, b in path_to_bundle.items() if wanted(p)}
by_bundle = defaultdict(set)
for p, b in targets.items():
    by_bundle[b].add(p)
print(f"{len(targets)} target assets across {len(by_bundle)} bundles: {sorted(by_bundle)}")

def dest(path: str, suffix: str | None = None) -> Path:
    p = OUT / path
    if suffix:
        p = p.with_suffix(suffix)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p

def safe_typetree(obj):
    try:
        return obj.read_typetree()
    except Exception as e:  # noqa: BLE001
        return {"_error": str(e)}

exported = 0
index = []
for bundle, paths in sorted(by_bundle.items()):
    env = UnityPy.load(str(SOFTREF / "Bundles" / bundle))
    for obj in env.objects:
        path = getattr(obj, "container", None)
        if not path or path not in paths:
            continue
        t = obj.type.name
        try:
            if t in ("Texture2D", "Sprite"):
                data = obj.read()
                img = data.image
                suffix = ".png" if t == "Texture2D" else f".{data.m_Name}.sprite.png"
                d = dest(path, suffix) if t == "Texture2D" else dest(path).with_name(dest(path).stem + ".sprite.png")
                img.save(d)
                index.append({"path": path, "type": t, "file": str(d), "size": img.size})
            elif t == "Font":
                data = obj.read()
                raw = bytes(data.m_FontData)
                d = dest(path)
                if not d.suffix.lower() in (".ttf", ".otf"):
                    d = d.with_suffix(".otf" if raw[:4] == b"OTTO" else ".ttf")
                d.write_bytes(raw)
                index.append({"path": path, "type": t, "file": str(d), "bytes": len(raw)})
            elif t == "Shader":
                data = obj.read()
                d = dest(path, ".shader.txt")
                try:
                    d.write_text(data.export())
                except Exception as e:  # noqa: BLE001
                    d.write_text(f"// export failed: {e}\n" + json.dumps(safe_typetree(obj), indent=1, default=str))
                index.append({"path": path, "type": t, "file": str(d)})
            elif t == "TextAsset":
                data = obj.read()
                d = dest(path)
                d.write_bytes(bytes(data.m_Script, "utf-8", "surrogateescape") if isinstance(data.m_Script, str) else bytes(data.m_Script))
                index.append({"path": path, "type": t, "file": str(d)})
            else:
                # Materials, prefabs (GameObject + components), animations, etc: dump typetree JSON
                d = dest(path).with_name(dest(path).name + f".{t}.{obj.path_id}.json")
                d.write_text(json.dumps(safe_typetree(obj), indent=1, default=str))
                index.append({"path": path, "type": t, "file": str(d)})
            exported += 1
        except Exception as e:  # noqa: BLE001
            print(f"  ! {t} {path}: {e}")

(OUT / "index.json").write_text(json.dumps(index, indent=1))
print(f"exported {exported} objects -> {OUT}")
