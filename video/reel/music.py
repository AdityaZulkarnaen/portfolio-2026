"""Music bed for the showreel: 120 BPM, A minor, 44 s, one continuous track (the films' synth).
Bars are 2 s (Am F C G). Every chapter cut (6, 10, 16, 20, 26, 30, 36) lands on a bar line and
gets a soft riser into a kick + tom accent; the end card at 40 gets the resolving chord.
Silent at 0 and from 43.3 s on, so the reel loops on ink without a click.

    python video/reel/music.py   →   video/reel/assets/music.wav
"""
import os
import wave

import numpy as np
from scipy.signal import lfilter

SR = 44100
DUR = 44.0
N = int(SR * DUR)
BEAT = 0.5
CUTS = [6.0, 10.0, 16.0, 20.0, 26.0, 30.0, 36.0]
END = 40.0
rng = np.random.default_rng(14)


def buf():
    return np.zeros((N, 2))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lp(x, a):
    return lfilter([a], [1, -(1 - a)], x)


def place(dst, sig, t, pan=0.0, g=1.0):
    i = int(round(t * SR))
    if i >= N:
        return
    sig = sig[: N - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    dst[i:i + len(sig), 0] += sig * left * g * 1.414
    dst[i:i + len(sig), 1] += sig * right * g * 1.414


def kick():
    n = int(.35 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * .9 + np.sin(ph * 2) * np.exp(-t * 40) * .1


def hat(open_=False):
    n = int((.18 if open_ else .05) * SR)
    x = rng.standard_normal(n); x = x - lp(x, .5)
    return x * env_ad(n, .001, .06 if open_ else .015) * .25


def clap():
    n = int(.25 * SR); x = rng.standard_normal(n); x = lp(x, .5) - lp(x, .08)
    e = np.zeros(n); t = np.arange(n) / SR
    for o in (0, .011, .022):
        e += (t >= o) * np.exp(-np.maximum(t - o, 0) * 35)
    return x * e * .35


def tom(m=45):
    n = int(.5 * SR); t = np.arange(n) / SR
    f = hz(m) * (1 + .6 * np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * .6


def pluck(m, d=.35, bright=.35):
    n = int(d * 1.6 * SR); t = np.arange(n) / SR; f = hz(m)
    x = (2 * ((t * f) % 1) - 1) * .5 + np.sin(2 * np.pi * f * t) * .5
    return lp(x, bright) * env_ad(n, .003, d * .45)


def bell(m, d=.9):
    n = int(d * 2 * SR); t = np.arange(n) / SR; f = hz(m)
    x = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 6))
    return x * env_ad(n, .002, d * .4) * .5


def bassnote(m, d):
    n = int(d * SR); t = np.arange(n) / SR; f = hz(m)
    x = np.tanh(2.2 * (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)))
    e = np.minimum(1, t / .005) * np.minimum(1, (d - t) / .02) * (.75 + .25 * np.exp(-t * 8))
    return lp(x, .18) * e * .5


def padchord(ms, d):
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in ms:
        for det in (-.08, .08):
            f = hz(m + det); x += 2 * ((t * f + rng.random()) % 1) - 1
    x = lp(lp(x, .045), .06) / (len(ms) * 2)
    return x * np.minimum(1, t / .25) * np.minimum(1, (d - t) / .3)


def riser(d):
    n = int(d * SR); x = rng.standard_normal(n); t = np.arange(n) / SR
    cut = np.linspace(.02, .3, n)
    y = np.empty(n); s = 0.0
    for i in range(0, n, 256):
        a = cut[i]
        seg = lfilter([a], [1, -(1 - a)], x[i:i + 256], zi=[s * (1 - a)])
        y[i:i + 256] = seg[0]; s = seg[0][-1]
    return y * (t / d) ** 2 * .5


drums, bass, keys, pad, fx = buf(), buf(), buf(), buf(), buf()

CH = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
ROOT = [45, 41, 48, 43]
ARP = [0, 1, 2, 1, 2, 0, 1, 2]

for b in range(int(END / 2)):
    t0 = b * 2.0; ci = b % 4
    place(pad, padchord(CH[ci], 2.05), t0, g=.5 if t0 >= 2 else .35)
    for k in range(8):
        tt = t0 + k * .25
        if tt < 2.0:
            continue
        if tt < 6.0 and k % 4:
            continue
        m = ROOT[ci] + (12 if k in (3, 6) else 0)
        place(bass, bassnote(m, .22), tt, g=.9 if tt >= 6 else .5)
        if tt >= 6.0:
            # Second half lifts an octave on the arp to keep 34 s of groove moving.
            lift = 12 if tt >= 26.0 and k == 4 else 0
            place(keys, pluck(CH[ci][ARP[k]] + 12 + (12 if k == 4 else 0) + lift, .3, .28), tt, pan=(-.35 if k % 2 else .35), g=.4)

for i in range(int(END / .25)):
    t = i * .25
    on_beat = abs(t / BEAT - round(t / BEAT)) < 1e-6
    if 2.0 <= t and on_beat:
        place(drums, kick(), t, g=.95 if t >= 6 else .55)
    if 6.0 <= t and abs((t % 1.0) - .5) < 1e-6:
        place(drums, clap(), t, g=.55)
    if 1.0 <= t and abs((t % .5) - .25) < 1e-6:
        place(drums, hat(), t, pan=.25, g=.5 if t >= 6 else .3)
    # Straight 8th hats in the back half (on-beat ones join the off-beat ones).
    if 26.0 <= t and on_beat:
        place(drums, hat(), t, pan=-.25, g=.22)

# Chapter cuts: a short riser into an open hat + low tom on the downbeat.
for c in CUTS:
    place(fx, riser(.75), c - .75, g=.16)
    place(drums, hat(True), c, pan=-.2, g=.45)
    place(drums, tom(43), c, g=.35)

# End card: kick, resolving Am(add octave) pad, four bells; gone by 43.3 s.
place(drums, kick(), END, g=.85)
place(pad, padchord((57, 60, 64, 69), 2.6), END, g=.6)
for j, m in enumerate([69, 72, 76, 81]):
    place(keys, bell(m, 1.0), END + j * .25, pan=(-.3 + .2 * j), g=.3)

t = np.arange(N) / SR
duck = np.ones(N)
ph = (t % BEAT) / BEAT
mask = (t >= 2.0) & (t < END)
duck[mask] = 1 - .35 * np.exp(-ph[mask] * 7)
duck = duck[:, None]
mix = drums * .55 + bass * duck * .55 + keys * duck * .35 + pad * duck * .5 + fx * .5
fade = np.clip(t / 1.0, 0, 1) * np.clip((43.3 - t) / 1.8, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.max(np.abs(mix)) / .89

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "music.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("music.wav", mix.shape, round(float(np.sqrt((mix ** 2).mean())), 4))
