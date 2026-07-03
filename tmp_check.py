from pathlib import Path
src = Path('src/engine.mjs').read_text()
stack = []
line = 1
state = 'code'
i = 0
while i < len(src):
    ch = src[i]
    nxt = src[i+1] if i+1 < len(src) else ''
    if state == 'linecomment':
        if ch == '\n':
            state = 'code'
            line += 1
        i += 1
        continue
    if state == 'blockcomment':
        if ch == '*' and nxt == '/':
            state = 'code'
            i += 2
            continue
        if ch == '\n':
            line += 1
        i += 1
        continue
    if state == 'singlequote':
        if ch == '\\':
            i += 2
            continue
        if ch == "'":
            state = 'code'
        if ch == '\n':
            line += 1
        i += 1
        continue
    if state == 'doublequote':
        if ch == '\\':
            i += 2
            continue
        if ch == '"':
            state = 'code'
        if ch == '\n':
            line += 1
        i += 1
        continue
    if state == 'template':
        if ch == '\\':
            i += 2
            continue
        if ch == '`':
            state = 'code'
        if ch == '\n':
            line += 1
        i += 1
        continue
    if ch == '/' and nxt == '/':
        state = 'linecomment'
        i += 2
        continue
    if ch == '/' and nxt == '*':
        state = 'blockcomment'
        i += 2
        continue
    if ch == "'":
        state = 'singlequote'
        i += 1
        continue
    if ch == '"':
        state = 'doublequote'
        i += 1
        continue
    if ch == '`':
        state = 'template'
        i += 1
        continue
    if ch in '{([':
        stack.append((ch, line))
    elif ch in '})]':
        if not stack:
            print('unmatched close', ch, 'line', line)
            break
        opener, opener_line = stack.pop()
        if (ch == '}' and opener != '{') or (ch == ')' and opener != '(') or (ch == ']' and opener != '['):
            print('mismatch', opener, ch, 'line', line)
            break
    if ch == '\n':
        line += 1
    i += 1
else:
    if stack:
        print('remaining', stack[-10:])
    else:
        print('balanced')
