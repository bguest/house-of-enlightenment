from hoe.animation_framework import Scene
from hoe.animation_framework import Effect
from generic_effects import NoOpCollaborationManager
from generic_effects import SolidBackground

from hoe.state import STATE

class SeizureMode(Effect):
    def __init__(self):
        self.foo = 1
        self.slice = ( slice(0,STATE.layout.rows), slice(0, STATE.layout.columns))
        self.on = True
        self.delta_t = 0.05
        self.last_step = 0;

    def scene_starting(self, now):
        pass

    def next_frame(self, pixels, now, collaboration_state, osc_data):

        if now - self.last_step > self.delta_t:
            self.last_step = now
            self.on = not self.on

        if self.on:
            pixels[self.slice] = (255,255,255)
        else:
            pixels[self.slice] = (0,0,0)


__all__ = [
    Scene("seizure_mode",
         NoOpCollaborationManager(),
         SolidBackground(),
         SeizureMode()
        )
]
