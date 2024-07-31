from collections import defaultdict

class CaptureOutput:
    def __init__(self):
        self.output = defaultdict(list)

    def capture_output(self, text, source):
        self.output[source].append(text)

    def read_output(self, source=None):
        if source:
            return ''.join(self.output[source])
        return ''.join(text for texts in self.output.values() for text in texts)
