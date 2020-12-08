import time
import RPi.GPIO as GPIO
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BOARD)

pin = 3
GPIO.setup(pin, GPIO.OUT,initial=GPIO.HIGH)

start = time.time()
try :
    while(time.time()-start<0.2):
        GPIO.output(pin,GPIO.LOW)
except KeyboardInterrupt:
        pass
finally:
    GPIO.cleanup()
#13, 18, 15, 22

