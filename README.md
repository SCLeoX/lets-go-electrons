# lets-go-electrons
A mini game used in an electrochemistry presentation.

# Warning
This game may contain security vulnerabilities (ACE on server/XSS). Use at your own risk. Also, please never run this game with people who really understand JavaScript. It is possible to control the entire game state from one client.

![](https://image.ibb.co/moLMDy/2018_05_17_02_43_53.gif)

# Usage
Use name "Operator" as the name will enable operator mode. The following commands will be made available in the JavaScript console:

## handle.start()
Start the game.

## handle.s0() handle.s1() handle.s2()
Switch to different levels.

## handle.loop(*time in ms*)
Change the main loop interval. Decrease interval will make the game feel more smooth but increase cpu load and network usage.
