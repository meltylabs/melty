import turtle

def draw_turtle():
    # Set up the screen
    screen = turtle.Screen()
    screen.title("Turtle Drawing")

    # Create a turtle
    t = turtle.Turtle()
    t.shape("turtle")
    t.color("green")

    # Draw the turtle's body (an oval)
    t.penup()
    t.goto(0, -50)
    t.pendown()
    t.circle(100, 90)
    t.circle(50, 90)
    t.circle(100, 90)
    t.circle(50, 90)

    # Draw the turtle's head
    t.penup()
    t.goto(50, 40)
    t.pendown()
    t.circle(30)

    # Draw the turtle's legs
    for _ in range(4):
        t.penup()
        t.goto(0, 0)
        t.pendown()
        t.forward(100)
        t.backward(100)
        t.right(90)

    # Hide the turtle and display the result
    t.hideturtle()
    screen.mainloop()

if __name__ == "__main__":
    draw_turtle()

