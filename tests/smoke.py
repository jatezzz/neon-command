"""Smoke test for Neon Command (Playwright, game at /site). JSON report; screenshots in /out."""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8099", "-d", "/site"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
BASE = "http://127.0.0.1:8099/index.html"
P = open("/site/tests/player.js").read()
R = {"errors": [], "checks": {}, "failed": []}
def check(name, ok, detail=None):
    R["checks"][name] = {"ok": bool(ok), "detail": detail}
    if not ok: R["failed"].append(name)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(**p.devices["iPhone 13"], locale="es-EC"); pg = ctx.new_page()
    pg.on("pageerror", lambda e: R["errors"].append(str(e)))
    pg.on("console", lambda m: m.type == "error" and R["errors"].append(m.text))
    pg.goto(BASE + "?debug=true&day=2026-11-22"); pg.wait_for_timeout(800)
    box = pg.evaluate("(() => { const r = document.getElementById('gameCanvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height, innerHeight, document.documentElement.scrollHeight]; })()")
    check("canvas fits phone", box[1] + box[3] <= box[4] + 1 and box[5] <= box[4] + 1, box)
    def at(fx, fy):   # field units -> screen
        return box[0] + fx * box[2] / 400, box[1] + fy * box[3] / 640
    pg.screenshot(path="/out/c01-title.png")
    pg.touchscreen.tap(*at(200, 300)); pg.wait_for_timeout(300)
    check("tap starts on the remembered level, with a starting army", pg.evaluate("game.state") == "play" and pg.evaluate("game.level") == "easy" and pg.evaluate("game.units.filter(u => u.side === 'you').length") == 3)
    pg.evaluate("game.units = game.units.filter(u => u.side !== 'you'); game.energy.you = 400")
    lay = pg.evaluate("game.barLayout()")
    spark = [l for l in lay if l["kind"] == "buy" and l["unit"] == "spark"][0]
    pg.touchscreen.tap(*at(spark["x"] + 20, spark["y"] + 20)); pg.wait_for_timeout(150)
    lancer = [l for l in lay if l["kind"] == "buy" and l["unit"] == "lancer"][0]
    pg.touchscreen.tap(*at(lancer["x"] + 20, lancer["y"] + 20)); pg.wait_for_timeout(150)
    mine = pg.evaluate("game.units.filter(u => u.side === 'you').map(u => u.kind)")
    check("bar buys units", "spark" in mine and "lancer" in mine, mine)
    chip = [l for l in lay if l["kind"] == "sel" and l["unit"] == "lancer"][0]
    pg.touchscreen.tap(*at(chip["x"] + 10, chip["y"] + 10)); pg.wait_for_timeout(100)
    check("chip selects a group", pg.evaluate("game.selected") == "lancer")
    pg.touchscreen.tap(*at(120, 300)); pg.wait_for_timeout(100)
    goals = pg.evaluate("game.units.filter(u => u.side === 'you').map(u => u.kind + ':' + (u.goal ? Math.round(u.goal.x) + ',' + Math.round(u.goal.y) : '-'))")
    check("map tap orders only the selected group", any(g.startswith("lancer:120,300") for g in goals) and not any(g.startswith("spark:120,300") for g in goals), goals)
    pg.wait_for_timeout(2500); pg.screenshot(path="/out/c02-play.png")
    pg.locator("#pauseBtn").dispatch_event("pointerdown"); pg.wait_for_timeout(200)
    t0 = pg.evaluate("game.battle"); pg.wait_for_timeout(400); t1 = pg.evaluate("game.battle")
    check("pause freezes", pg.evaluate("game.paused") and t0 == t1)
    pg.touchscreen.tap(*at(200, 300)); pg.wait_for_timeout(150)
    check("tap resumes", not pg.evaluate("game.paused"))
    pg.locator("#pauseBtn").dispatch_event("pointerdown"); pg.wait_for_timeout(200)
    pg.screenshot(path="/out/c02b-pause.png")
    sb = pg.evaluate("game.pauseButtons().surrender")
    pg.touchscreen.tap(*at(sb["x"] + 50, sb["y"] + 20)); pg.wait_for_timeout(300)
    check("give up ends the battle as a loss", pg.evaluate("game.state") in ("ending", "over") and not pg.evaluate("game.won"), pg.evaluate("game.state"))
    # a full battle in fast-forward with the test player
    pg.goto(BASE + "?debug=true&day=2026-11-23&vs=2000"); pg.wait_for_timeout(500)
    lv = pg.evaluate("game.levelButtons()")
    hard = [l for l in lv if l["key"] == "hard"][0]
    pg.touchscreen.tap(*at(hard["x"] + 30, hard["y"] + 20)); pg.wait_for_timeout(200)
    check("title: tap a level picks it and starts", pg.evaluate("game.level") == "hard" and pg.evaluate("game.state") == "play")
    pg.evaluate("game.setLevel('easy'); game.state = 'title'")
    pg.add_script_tag(content=P)
    r = pg.evaluate("() => { NCPlayer.install(game, {}); let n = 0; while (game.state !== 'ending' && game.state !== 'over' && n < 120 * 900) { game.update(1/120); n++; } return {state: game.state, won: game.won, score: game.score, minutes: +(game.battle/60).toFixed(1)}; }")
    R["battle"] = r
    check("battle ends", r["state"] in ("ending", "over"), r)
    pg.wait_for_timeout(600); pg.screenshot(path="/out/c03-end.png")
    pg.wait_for_timeout(2600)
    check("game-over card", pg.evaluate("!document.getElementById('gameover').hidden"))
    share = pg.evaluate("NeonDaily.shareMessage()"); R["share"] = share
    check("share text", share and "Neon Command · Batalla #2" in share and "(Fácil)" in share and "/play/neon-command?d=2026-11-23" in share, share)
    pg.screenshot(path="/out/c04-over.png")
    ctx.close()
    plans = []
    for day in ("2026-11-22", "2026-11-22", "2026-11-23"):
        c = b.new_context(); q = c.new_page(); q.goto(BASE + "?debug=true&day=" + day); q.wait_for_timeout(300)
        plans.append(q.evaluate("JSON.stringify(NeonCommand.dayPlan())")); c.close()
    check("same day, same battle; other day differs", plans[0] == plans[1] and plans[2] != plans[0])
    c = b.new_context(viewport={"width": 1280, "height": 800}, locale="en-US"); q = c.new_page()
    q.on("pageerror", lambda e: R["errors"].append(str(e)))
    q.goto(BASE + "?debug=true&day=2026-11-22"); q.wait_for_timeout(500)
    q.keyboard.press("Space"); q.wait_for_timeout(200)
    q.evaluate("game.energy.you = 200"); q.keyboard.press("Digit3"); q.wait_for_timeout(100)
    check("keyboard: space starts, 3 buys a bulwark", q.evaluate("game.units.some(u => u.side === 'you' && u.kind === 'bulwark')"))
    check("english", q.evaluate("document.title") == "Neon Command: daily challenge")
    q.wait_for_timeout(1500); q.screenshot(path="/out/c05-desktop.png")
    c.close(); b.close()
srv.terminate()
print(json.dumps(R, indent=1, ensure_ascii=False))
