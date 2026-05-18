#!/usr/bin/env python3
"""Robustly split a Rust legacy.rs into dto.rs, handlers.rs, service.rs, routes.rs, mod.rs.
Uses top-level item start patterns at column 0.
Merges attributes (#[...]) with the following item.
Post-processes visibility so inter-file references work via use super::*.
"""
import sys, re, os, argparse

# Regex for top-level item starts at column 0 (no leading whitespace)
# Attributes #[...] are NOT item starts - they attach to the next item
TOP_LEVEL_RE = re.compile(
    r'^(?:'
    r'use\s'                # use statement
    r'|pub\s'                # pub
    r'|async\s+fn\s'        # async fn
    r'|fn\s'                 # fn
    r'|struct\s'             # struct
    r'|enum\s'               # enum
    r'|type\s'                # type
    r'|const\s'               # const
    r'|static\s'              # static
    r'|mod\s'                 # mod
    r'|impl\s'                # impl
    r'|trait\s'               # trait
    r')'
)

def extract_use_lines(lines):
    """Extract use statements including multi-line blocks."""
    use_lines = []
    in_multi_line_use = False
    for l in lines:
        stripped = l.strip()
        if stripped.startswith("use "):
            use_lines.append(l)
            if stripped.endswith("{") or stripped.endswith("("):
                in_multi_line_use = True
        elif in_multi_line_use:
            use_lines.append(l)
            if stripped == "};" or stripped == ");" or (stripped.endswith(";") and not stripped.endswith("::")):
                in_multi_line_use = False
        elif not stripped:
            if not use_lines or (use_lines and (use_lines[-1].strip().startswith("use") or use_lines[-1].strip() == "")):
                use_lines.append(l)
        else:
            if TOP_LEVEL_RE.match(l) and not stripped.startswith("//"):
                break
    return use_lines

def parse_items(lines):
    """Group lines into top-level items based on start patterns at column 0.
    Attributes #[...] are merged with the following item."""
    items = []
    current = []
    pending_attrs = []
    in_item = False

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("#[") and not line.startswith(" ") and not line.startswith("\t"):
            # Top-level attribute - buffer it (ignore indented field attributes)
            pending_attrs.append(line)
            continue

        is_top_level = bool(TOP_LEVEL_RE.match(line))

        if is_top_level:
            if in_item:
                items.append(current)
            # Start new item with any pending attributes
            current = pending_attrs + [line]
            pending_attrs = []
            in_item = True
        elif in_item:
            current.append(line)

    if in_item and current:
        items.append(current)
    return items

def is_struct_or_enum_item(item_lines):
    text = "".join(item_lines)
    if re.search(r'(?:#\[derive\([^)]*\)\]\s*)*(?:pub\s+)?struct\s+', text):
        return True
    if re.search(r'(?:#\[derive\([^)]*\)\]\s*)*(?:pub\s+)?enum\s+', text):
        return True
    if re.search(r'(?:pub\s+)?type\s+', text):
        return True
    return False

def classify_item(item_lines):
    text = "".join(item_lines)
    first = item_lines[0].strip() if item_lines else ""

    if first.startswith("use "):
        return "use"

    if is_struct_or_enum_item(item_lines):
        return "dto"

    if first.startswith("const ") or first.startswith("pub const "):
        return "service"

    if re.search(r'pub\s+async\s+fn\s+\w+\s*\(', text):
        if "State(" in text or "AuthUser" in text or "Json<" in text or "Path<" in text or "Query<" in text or "IntoResponse" in text or "HeaderMap" in text or "Bytes" in text:
            return "handler"
        return "service"

    if re.search(r'pub\s+fn\s+\w+\s*\(', text):
        return "service"

    if re.search(r'async\s+fn\s+\w+\s*\(', text):
        return "service"

    if re.search(r'fn\s+\w+\s*\(', text):
        return "service"

    if first.startswith("impl ") or first.startswith("pub impl "):
        return "service"

    return "service"

def postprocess_dto(path):
    with open(path, "r") as f:
        lines = f.readlines()
    out = []
    in_struct_or_enum = False
    brace_depth = 0
    for line in lines:
        stripped = line.strip()
        # Detect struct/enum start (including after attributes)
        if re.search(r'^(?:#\[.*?\]\s*)*(?:pub\s+)?(struct|enum)\s+', stripped):
            in_struct_or_enum = True
            brace_depth = 0

        if in_struct_or_enum:
            brace_depth += line.count("{") - line.count("}")
            # Make struct/enum pub
            line = re.sub(r'^(\s*)(?!pub\s)(struct\s+)', r'\1pub \2', line)
            line = re.sub(r'^(\s*)(?!pub\s)(enum\s+)', r'\1pub \2', line)
            # Make fields pub (indented lines with ident: Type)
            if brace_depth > 0 and stripped and not stripped.startswith("}") and not stripped.startswith("//"):
                line = re.sub(r'^(\s+)(?!pub\s)(\w+\s*:)', r'\1pub \2', line)
            if brace_depth <= 0 and stripped.endswith("}"):
                in_struct_or_enum = False

        out.append(line)
    with open(path, "w") as f:
        f.writelines(out)

def postprocess_service(path):
    with open(path, "r") as f:
        lines = f.readlines()
    out = []
    for line in lines:
        line = re.sub(r'^(\s*)(?!pub\s)(async\s+fn\s+)', r'\1pub \2', line)
        line = re.sub(r'^(\s*)(?!pub\s)(fn\s+)', r'\1pub \2', line)
        out.append(line)
    with open(path, "w") as f:
        f.writelines(out)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("legacy_path")
    parser.add_argument("--mod-name", default=None)
    args = parser.parse_args()

    legacy_path = args.legacy_path
    if not os.path.exists(legacy_path):
        print(f"File not found: {legacy_path}")
        sys.exit(1)

    dir_name = os.path.dirname(legacy_path)
    mod_name = args.mod_name or os.path.basename(dir_name)

    with open(legacy_path, "r") as f:
        lines = f.readlines()

    use_lines = extract_use_lines(lines)
    non_use_lines = lines[len(use_lines):]

    items = parse_items(non_use_lines)

    dto_items = []
    handler_items = []
    service_items = []

    for item in items:
        cls = classify_item(item)
        if cls == "dto":
            dto_items.append(item)
        elif cls == "handler":
            handler_items.append(item)
        elif cls == "service":
            service_items.append(item)

    def write_file(path, items):
        if not items:
            return
        with open(path, "w") as f:
            f.writelines(use_lines)
            if use_lines:
                f.write("\n")
            f.write("use super::*;\n\n")
            for item in items:
                f.writelines(item)
                f.write("\n")

    write_file(os.path.join(dir_name, "dto.rs"), dto_items)
    write_file(os.path.join(dir_name, "handlers.rs"), handler_items)
    write_file(os.path.join(dir_name, "service.rs"), service_items)

    postprocess_dto(os.path.join(dir_name, "dto.rs"))
    postprocess_service(os.path.join(dir_name, "service.rs"))

    routes_path = os.path.join(dir_name, "routes.rs")
    with open(routes_path, "w") as f:
        f.write("use axum::Router;\n")
        f.write("use crate::state::AppState;\n\n")
        f.write("pub fn routes() -> Router<AppState> {\n")
        f.write("    Router::new()\n")
        f.write("        // TODO: add routes\n")
        f.write("}\n")

    mod_path = os.path.join(dir_name, "mod.rs")
    with open(mod_path, "w") as f:
        f.write(f"//! {mod_name} module.\n\n")
        f.write("pub mod dto;\n")
        f.write("pub mod handlers;\n")
        f.write("pub mod service;\n")
        f.write("pub mod routes;\n\n")
        f.write("pub use dto::*;\n")
        f.write("pub use handlers::*;\n")
        f.write("pub use service::*;\n")

    os.remove(legacy_path)
    print(f"Split {legacy_path} into dto.rs ({len(dto_items)}), handlers.rs ({len(handler_items)}), service.rs ({len(service_items)})")

if __name__ == "__main__":
    main()
