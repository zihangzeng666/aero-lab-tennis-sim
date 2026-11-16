"""Browser smoke test for Rackets Lab (Python Playwright, Chrome).

    python3 tests/e2e_smoke.py [--shots /workspace/shots]

Serves the repository root with `python3 -m http.server` on a free port, then checks:
  - the landing page and /lab/ load with zero console errors, on a phone and on a desktop
  - no horizontal overflow at 390 px (landing and lab), 844x390 landscape and iPad
  - picking an incoming ball moves the hitter to where that ball is met
  - a real touch drag on the racket-face dial changes the face, re-simulates the shot and does
    not scroll the page; pin keeps the compare path; Suggest face lands the ball deep
  - the 3D contact close-up: opens from the coach dial, a touch drag on the 3D racket changes
    the face and re-simulates, Done flies back; from the impact studio it opens over the court
    and gives the studio back on close
and saves screenshots to the --shots folder.
"""
import argparse
import contextlib
import os
import socket
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']


def free_port():
    with contextlib.closing(socket.socket()) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class Checks:
    def __init__(self):
        self.failed = []

    def ok(self, cond, msg):
        print(('PASS ' if cond else 'FAIL ') + msg)
        if not cond:
            self.failed.append(msg)


def open_page(browser, url, w, h, mobile, errors, label):
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1,
                              is_mobile=mobile, has_touch=mobile, locale='en-US')
    page = ctx.new_page()
    page.on('console', lambda m: errors.append(f'{label}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(f'{label}: {e}'))
    page.goto(url)
    page.wait_for_load_state('networkidle')
    return ctx, page


def load_lazy(page):
    height = page.evaluate('document.body.scrollHeight')
    for y in range(0, height, 500):
        page.evaluate(f'scrollTo(0, {y})')
        page.wait_for_timeout(50)
    page.evaluate('scrollTo(0, 0)')
    page.wait_for_timeout(1600)  # hero draw-in finishes


def overflow(page):
    return page.evaluate('document.documentElement.scrollWidth - window.innerWidth')


TARGETS = """.ball-chip, .coach-btn, .face-dial, #coach-swingPathDeg, #coach-racketSpeedKmh, .mode-switch-btn,
  .view-switch .seg-btn, #mobileSheetHandle, #langSwitchGroup .seg-btn, #themeSwitchGroup .seg-btn, .topbar-brand, .m-fab"""


def small_targets(page):
    """Visible controls smaller than 44 x 44 css px (in the viewport or in the sheet)."""
    return page.evaluate("""(sel) => [...document.querySelectorAll(sel)]
        .filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden')
        .map(e => [e.id || e.className, e.getBoundingClientRect()])
        .filter(([, r]) => r.width > 0 && (r.height < 43.5 || r.width < 43.5))
        .map(([n, r]) => `${n} ${Math.round(r.width)}x${Math.round(r.height)}`)""", TARGETS)


def touch_drag(page, x0, y0, x1, y1, steps=14):
    """A real finger drag (CDP touch events), so touch-action and pointer capture are exercised."""
    cdp = page.context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
    for i in range(1, steps + 1):
        x = x0 + (x1 - x0) * i / steps
        y = y0 + (y1 - y0) * i / steps
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]})
        page.wait_for_timeout(16)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_timeout(400)


def open_closeup(page):
    page.wait_for_selector('.cc-layer.is-open', timeout=10000)
    page.wait_for_timeout(700)  # knobs and card fade in


def racket_on_screen(page):
    """Where the 3D racket's strings are on screen (CSS px), from the close-up's own projection."""
    return page.evaluate("""() => { const cc = tennisApp.closeup; const r = cc.layer.getBoundingClientRect();
        const p = cc._project(cc.rig.position); return [r.left + p.x, r.top + p.y]; }""")


def close_closeup(page):
    page.click('.cc-done')
    page.wait_for_function("document.querySelector('.cc-layer').hidden", timeout=10000)
    page.wait_for_timeout(300)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--shots', default=os.path.join(ROOT, 'shots'))
    args = ap.parse_args()
    os.makedirs(args.shots, exist_ok=True)
    shot = lambda name: os.path.join(args.shots, name)

    port = free_port()
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                              cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f'http://127.0.0.1:{port}'
    for _ in range(50):
        with contextlib.suppress(OSError), socket.create_connection(('127.0.0.1', port), timeout=0.2):
            break
        time.sleep(0.1)

    c = Checks()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True, args=GL)

            # ---------------- Landing ----------------
            ctx, page = open_page(browser, f'{base}/', 390, 844, True, errors, 'landing 390')
            load_lazy(page)
            c.ok(overflow(page) <= 0, 'landing: no horizontal overflow at 390 px')
            c.ok(page.locator('a.btn[href="lab/"]').count() >= 2, 'landing: "Open the lab" CTAs point to lab/')
            c.ok(page.locator('.ball-list .ball').count() == 8, 'landing: eight incoming balls listed')
            page.screenshot(path=shot('rackets_landing_390.png'), full_page=True)
            ctx.close()

            ctx, page = open_page(browser, f'{base}/', 1440, 900, False, errors, 'landing desktop')
            load_lazy(page)
            c.ok(overflow(page) <= 0, 'landing: no horizontal overflow at 1440 px')
            page.screenshot(path=shot('rackets_landing_desktop.png'), full_page=True)
            # the CTA really opens the lab
            page.click('.hero a.btn')
            page.wait_for_load_state('networkidle')
            c.ok(page.url.rstrip('/').endswith('/lab'), f'landing CTA opens the lab ({page.url})')
            ctx.close()

            # ---------------- Lab, phone portrait ----------------
            ctx, page = open_page(browser, f'{base}/lab/', 390, 844, True, errors, 'lab 390')
            page.wait_for_timeout(2500)
            c.ok(overflow(page) <= 0, 'lab: no horizontal overflow at 390 px')
            c.ok(page.evaluate("document.body.classList.contains('coach-on')"), 'lab opens in the coach view')
            c.ok(page.locator('.ball-chip').count() == 8, 'lab: eight incoming-ball chips')
            c.ok(page.inner_text('.cr-verdict') == 'In', 'first shot lands in (face set by the solver)')
            small = small_targets(page)
            c.ok(not small, f'lab 390: every visible control is at least 44x44 ({small})')
            c.ok(page.evaluate("document.documentElement.dataset.theme") == 'light', 'lab opens in the light theme')
            c.ok(page.get_attribute('#mobileSheetHandle', 'aria-label') == 'Expand or collapse the control panel', 'sheet handle aria-label is in English')
            c.ok('up to' in page.inner_text('.ball-detail'), 'preset caption shows the bounce peak')
            page.screenshot(path=shot('rackets_lab_390.png'))

            # pick a ball
            page.click('.ball-chip[data-ball="low_slice"]')
            page.wait_for_timeout(600)
            st = page.evaluate('({...tennisApp.state})')
            c.ok(page.get_attribute('.ball-chip[data-ball="low_slice"]', 'aria-checked') == 'true', 'slice chip is selected')
            c.ok(st['hitZ'] < 0.6 and st['incomingSpinRpm'] < 0, f"slice is met low with backspin (z {st['hitZ']}, {st['incomingSpinRpm']} rpm)")
            page.evaluate("tennisApp._setSheetSnap('full')")
            page.wait_for_timeout(400)
            page.evaluate("document.querySelector('.m-sheet-body').scrollTop = 0")
            page.wait_for_timeout(300)
            page.screenshot(path=shot('rackets_presets_390.png'))

            # heavy topspin, suggest the face, pin it, then open the face with a finger on the dial
            page.click('.ball-chip[data-ball="heavy_topspin"]')
            page.wait_for_timeout(400)
            page.click('.coach-suggest')
            page.wait_for_timeout(400)
            c.ok(page.inner_text('.cr-verdict') == 'In', 'Suggest face lands the topspin ball in')
            page.click('.coach-pin')
            c.ok(page.get_attribute('.coach-pin', 'aria-pressed') == 'true', 'pin toggles on')
            face0 = page.evaluate('tennisApp.state.faceAngleDeg')
            dial = page.locator('.fd-svg')
            dial.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            box = dial.bounding_box()
            cx = box['x'] + box['width'] * 104 / 208
            cy = box['y'] + box['height'] * 96 / 152
            sheet_scroll0 = page.evaluate("document.querySelector('.m-sheet-body').scrollTop")
            # finger on the racket head, swept counter-clockwise (opens the face)
            touch_drag(page, cx + 8, cy - 60, cx - 18, cy - 57)
            face1 = page.evaluate('tennisApp.state.faceAngleDeg')
            c.ok(face1 > face0 + 3, f'touch drag on the dial opens the face ({face0} -> {face1})')
            c.ok(page.evaluate("document.querySelector('.m-sheet-body').scrollTop") == sheet_scroll0 and page.evaluate('scrollY') == 0,
                 'dragging the dial does not scroll the sheet or the page')
            verdict = page.inner_text('.cr-verdict')
            c.ok(verdict == 'Long', f'opening the face against topspin sends the ball long ({verdict})')
            lines = page.inner_text('.cr-feedback')
            c.ok('too open' in lines and 'Close the face' in lines, 'feedback names the cause and the fix')
            c.ok(page.evaluate('tennisApp.coachCompare !== null && tennisApp.coachPinned'), 'pinned compare path is kept')
            c.ok(page.locator('.cp-ghost').count() == 1 and page.locator('.cp-path').count() == 1, 'side view shows the shot and the ghost')
            page.evaluate("const b = document.querySelector('.m-sheet-body'); b.scrollTop = document.querySelector('.coach-racket-sec').getBoundingClientRect().top - b.getBoundingClientRect().top + b.scrollTop")
            page.wait_for_timeout(300)
            page.screenshot(path=shot('rackets_face_compare_390.png'))

            # 3D contact close-up from the coach view: a tap on the dial opens it
            page.locator('.face-dial').tap()
            open_closeup(page)
            c.ok(page.evaluate("tennisApp.closeup.phase") == 'open', 'tapping the face dial opens the 3D contact close-up')
            c.ok(page.evaluate("document.body.classList.contains('cc-stage')"), 'phone: the close-up takes the whole screen')
            knobs = page.evaluate("""() => [...document.querySelectorAll('.cc-knob-dot, .cc-done, .cc-reset')]
                .map(e => e.getBoundingClientRect()).every(r => r.width >= 43.5 && r.height >= 43.5 && r.top >= 0 && r.bottom <= innerHeight)""")
            c.ok(knobs, 'close-up: knobs, Done and Reset are on screen and at least 44x44')
            page.screenshot(path=shot('rackets_closeup_390.png'))
            face0 = page.evaluate('tennisApp.state.faceAngleDeg')
            sim0 = page.evaluate('tennisApp.simResult.firstBounce && tennisApp.simResult.firstBounce.x')
            x, y = racket_on_screen(page)
            touch_drag(page, x, y, x, y + 70)  # drag the racket down: closes the face
            face1 = page.evaluate('tennisApp.state.faceAngleDeg')
            sim1 = page.evaluate('tennisApp.simResult.firstBounce && tennisApp.simResult.firstBounce.x')
            c.ok(face1 < face0 - 5, f'touch drag on the 3D racket closes the face ({face0} -> {face1})')
            c.ok(sim1 != sim0, f'the shot re-simulates from the close-up (bounce x {sim0} -> {sim1})')
            c.ok(page.inner_text('.cc-verdict') == page.inner_text('.cr-verdict'), 'close-up card and coach result agree')
            c.ok(page.evaluate("Math.abs(tennisApp.coach.face - tennisApp.state.faceAngleDeg) < 1e-6"),
                 'the 2D face dial follows the close-up')
            page.screenshot(path=shot('rackets_closeup_dragged_390.png'))
            close_closeup(page)
            c.ok(not page.evaluate("document.body.classList.contains('cc-on') || document.body.classList.contains('cc-stage')"),
                 'Done flies back and restores the page')
            ctx.close()

            # ---------------- Lab, phone landscape ----------------
            ctx, page = open_page(browser, f'{base}/lab/', 844, 390, True, errors, 'lab landscape')
            page.wait_for_timeout(2500)
            c.ok(overflow(page) <= 0, 'lab: no horizontal overflow at 844x390')
            small = small_targets(page)
            c.ok(not small, f'lab landscape: every visible control is at least 44x44 ({small})')
            inview = page.evaluate("""() => ['.cr-verdict', '.face-dial', '#coach-swingPathDeg', '#coach-racketSpeedKmh', '.coach-suggest']
                .map(s => document.querySelector(s).getBoundingClientRect()).every(r => r.top >= 0 && r.bottom <= innerHeight + 1)""")
            c.ok(inview, 'lab landscape: result, face dial, swing sliders and Suggest are visible without scrolling')
            vp = page.locator('#viewport3d').bounding_box()
            c.ok(vp and vp['height'] > 200, f"lab landscape: the 3D court keeps most of the height ({vp and round(vp['height'])} px)")
            page.screenshot(path=shot('rackets_lab_390_landscape.png'))
            ctx.close()

            # ---------------- iPhone SE portrait ----------------
            ctx, page = open_page(browser, f'{base}/lab/', 375, 667, True, errors, 'lab SE')
            page.wait_for_timeout(2500)
            c.ok(overflow(page) <= 0, 'lab: no horizontal overflow at 375x667')
            top = page.evaluate("document.querySelector('.face-dial').getBoundingClientRect().top")
            vtop = page.evaluate("document.querySelector('.cr-verdict').getBoundingClientRect().top")
            c.ok(vtop < 667 and top < 667, f'iPhone SE: result visible and the dial starts on screen (dial top {round(top)} px)')
            page.screenshot(path=shot('rackets_lab_se.png'))
            ctx.close()

            # ---------------- Lab, iPad and desktop ----------------
            ctx, page = open_page(browser, f'{base}/lab/', 820, 1180, True, errors, 'lab ipad')
            page.wait_for_timeout(2500)
            c.ok(overflow(page) <= 0, 'lab: no horizontal overflow on iPad portrait')
            page.screenshot(path=shot('rackets_lab_ipad.png'))
            ctx.close()

            ctx, page = open_page(browser, f'{base}/lab/', 1440, 900, False, errors, 'lab desktop')
            page.wait_for_timeout(2500)
            page.click('#langSwitchGroup [data-lang="zh"]')
            page.wait_for_timeout(300)
            c.ok(page.get_attribute('#mobileSheetHandle', 'aria-label') == '展开或收起参数面板' and page.get_attribute('#appModeSwitchGroup', 'aria-label') == '模式',
                 'aria-labels follow the language toggle')
            page.click('#langSwitchGroup [data-lang="en"]')
            page.wait_for_timeout(300)
            page.click('.ball-chip[data-ball="kick_serve"]')
            page.wait_for_timeout(1200)
            page.screenshot(path=shot('rackets_lab_desktop.png'))
            # the other modes still work
            for mode in ['solo', 'rally', 'tactics', 'coach']:
                page.click(f'.mode-switch-btn[data-app-mode="{mode}"]')
                page.wait_for_timeout(700)
            c.ok(page.evaluate("document.body.classList.contains('coach-on')"), 'switching through Lab, Rally, Tactics and back to Coach works')

            # 3D contact close-up from the impact studio: flies in from the court, gives the studio back
            page.click('.mode-switch-btn[data-app-mode="solo"]')
            page.wait_for_timeout(600)
            page.click('#viewSwitch [data-view="studio"]')
            page.wait_for_timeout(400)
            page.click('.is-contact')
            c.ok(page.evaluate("tennisApp.courtView") == '3d', 'impact studio: the court comes back for the zoom')
            open_closeup(page)
            speed0 = page.evaluate('tennisApp.state.racketSpeedKmh')
            page.focus('.cc-knob[data-k="speed"]')
            for _ in range(6):
                page.keyboard.press('ArrowUp')
            page.wait_for_timeout(500)
            speed1 = page.evaluate('tennisApp.state.racketSpeedKmh')
            c.ok(speed1 > speed0 + 4, f'close-up swing knob (keyboard) raises the racket speed ({speed0} -> {speed1})')
            c.ok(page.input_value('#racketSpeedKmh') == str(speed1) or abs(float(page.input_value('#racketSpeedKmh')) - speed1) < 1e-6,
                 'the solo slider follows the close-up')
            page.screenshot(path=shot('rackets_closeup_desktop.png'))
            close_closeup(page)
            c.ok(page.evaluate("tennisApp.courtView") == 'studio', 'closing the close-up gives the impact studio back')
            ctx.close()

            # ---------------- Validation page ----------------
            ctx, page = open_page(browser, f'{base}/validation.html', 1280, 800, False, errors, 'validation redirect')
            page.wait_for_timeout(1500)
            c.ok(page.url.endswith('/lab/validation.html'), 'old /validation.html redirects to lab/validation.html')
            ctx.close()

            browser.close()
    finally:
        server.terminate()

    c.ok(not errors, 'zero console errors' + ('' if not errors else ': ' + ' | '.join(errors[:8])))
    print(f"\n{len(c.failed)} failed" if c.failed else '\nall passed')
    sys.exit(1 if c.failed else 0)


if __name__ == '__main__':
    main()
