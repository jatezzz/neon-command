"""Fast-forward battles: the test player against the bot of several days. Result, length, score."""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright
DAYS = sys.argv[1].split(","); ATTACK = [int(a) for a in sys.argv[2].split(",")]
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8092", "-d", "/site"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
P = open("/site/tests/player.js").read()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    for day in DAYS:
        for a in ATTACK:
            pg.goto(f"http://127.0.0.1:8092/index.html?debug=true&day={day}"); pg.wait_for_timeout(200)
            pg.add_script_tag(content=P)
            r = pg.evaluate("""(a) => { NCPlayer.install(game, {attackAt: a}); let n = 0; while (game.state !== 'over' && n < 120 * 900) { game.update(1/120); n++; }
              return {won: game.won, state: game.state, score: game.score, minutes: +(game.battle / 60).toFixed(1), kills: game.stats.kills, lost: game.stats.lost, built: game.stats.built,
                      coreYou: Math.round(game.cores.you.hp), coreBot: Math.round(game.cores.bot.hp), plan: {attackAt: game.plan.attackAt, crystals: game.plan.crystals.length}}; }""", a)
            print(day, a, json.dumps(r), flush=True)
    b.close()
srv.terminate()
