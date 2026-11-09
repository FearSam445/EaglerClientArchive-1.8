# Prompt Master

Prompt Master turns a rough, quickly typed prompt into a clear, well-structured one before Claude sees it. It works in the terminal, the desktop app, VS Code, the web and the phone app.

## Use it

- **One-off:** start any message with `++`, e.g. `++ make snake game with score`. Prompt Master rewrites it and sends the improved version.
- **Auto mode:** run `/prompt-master` (or click the **✨ Prompt Master: OFF** button above the prompt box where your app shows it) to turn auto mode on. Every prompt you send is then rewritten first. Run it again to turn it off.
- **Preview:** `/prompt-master <rough prompt>` shows the rewrite without sending it (in a terminal it is placed straight into the prompt box).

After each rewrite a line in the chat shows exactly what was sent. Prompt Master keeps your intent, file names, code and constraints, adds a clear goal and definition of done, and leaves short replies like "yes" or "thanks" alone. Rewrites use your own Claude session.
