class Potato:
    def __init__(self, variety, weight):
        self.variety = variety
        self.weight = weight

    def describe(self):
        return f"This is a {self.variety} potato weighing {self.weight} grams."

def cook_potato(potato):
    return f"Cooking the {potato.variety} potato..."

# Example usage
if __name__ == "__main__":
    my_potato = Potato("Russet", 200)
    print(my_potato.describe())
    print(cook_potato(my_potato))
