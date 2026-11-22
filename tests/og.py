import subprocess, sys, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8098", "-d", "/site"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
P = open("/site/tests/player.js").read()
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 400, "height": 760}, device_scale_factor=2)
    pg.goto("http://127.0.0.1:8098/index.html?debug=true&day=2026-11-22&lang=es"); pg.wait_for_timeout(600)
    pg.add_script_tag(content=P)
    # a moment with both armies fighting: at least 6 units a side and twelve within 70 px of an enemy
    fy = pg.evaluate("""() => { game.frame = function () {}; NCPlayer.install(game, {}); game.startRun();
        let best = null;
        while (game.state === 'play' && game.battle < 240) {
          for (let i = 0; i < 30; i++) game.update(1/120);
          const you = game.units.filter(u => u.side === 'you'), bot = game.units.filter(u => u.side === 'bot');
          const close = game.units.filter(u => game.units.some(e => e.side !== u.side && (e.x-u.x)**2 + (e.y-u.y)**2 < 4900));
          if (you.length >= 4 && bot.length >= 4 && close.length >= 7) { best = close.reduce((a, u) => a + u.y, 0) / close.length; break; }
        }
        game.draw(); return best; }""")
    pg.locator("#gameCanvas").screenshot(path="/out/battle.png")
    open("/out/fight_y.txt", "w").write(str(fy))
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto("http://127.0.0.1:8098/tools/og.html"); pg.wait_for_timeout(800)
    pg.locator("#c").screenshot(path="/out/og.png")
    b.close()
srv.terminate(); print("done")
