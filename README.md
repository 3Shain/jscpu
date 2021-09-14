# Build a CPU out of logic gate in TypeScript

It's romantic (meaning waste of time).

## How to play with it

```sh
pnpm install
cd packages/playground
pnpm exec vite
```

Then open the console.

Use `tick()` to create a clock cycle.

## Description

* 16-bits CPU. It's working.
* Up to 64KB RAM.
* 4 general purpose register. (can expand the number of them easily).
* Variable instruction cycle. (from 2 to ...)
* Variable machine code length. (from 2 to ...)

### Instructions
Current it can do:
* Copy data between immediate/register/memery
* Add/Substract
* Halt and do nothing
* Jump, w/ condition
* Stack (push,pop)
* Call/return

#### Layout
* 2*_n_ bytes
* 1st byte : instruction
    * 1st bit: 8 bit mode (for instructions involving immediate/memory address)
* 2nd byte : register address
    * 1st 4-bits is destination, followed by 4-bits source.
    * Reg A: 0b0001
    * Reg B: 0b0010
* others: immediate

Some instructions don't require register information (like JMP), so 2nd byte is not needed (directly followed by imm.)

#### References

* HALT

    ```jsx
    0b00001111
    ```
* NOP
    ```jsx
    0b00011011
    ```

* MOV reg imm (from imm. to register)
    ```jsx
    0b00001000,<register-addr>,<immediate-l>,<immediate-h>
    0b10001000,<register-addr>,<immediate-l>
    ```
* MOV dst src (from register to register)
    ```jsx
    0b00001001,<register-addr>
    0b10001001,<register-addr>
    ```
* MOV reg mem
    ```jsx
    0b00001010,<register-addr>,<addr-l>,<addr-h>
    0b10001010,<register-addr>,<addr-l>,<addr-h>
    ```
* MOV mem reg
    ```jsx
    0b00001011,<register-addr>,<addr-l>,<addr-h>
    0b10001011,<register-addr>,<addr-l>,<addr-h>
    ```

* ADD dst src : add accumulator (A register) with [source] (register) and store the result in [dest] (register)
    ```jsx
    0b00000100,<register-addr>
    0b10000100,<register-addr>
    ```
* SUB dst src : substract: similar to add.
    ```jsx
    0b00000101,<register-addr>
    0b10000101,<register-addr>
    ```

* INC dst src

    ```jsx
    0b00001100,<register-addr>
    ```

* DEC dst src

    ```jsx
    0b00001101,<register-addr>
    ```

* JMP : unconditional jump

    ```jsx
    0b00010100,<addr-l>,<addr-h>
    ```
* JZ : jump if zero

    ```jsx
    0b00010110,<addr-l>,<addr-h>
    ```

    > Flag zero: Avaliable after ADD/SUB/INC/DEC
* JNZ : jump if not zero

    ```jsx
    0b00010111,<addr-l>,<addr-h>
    ```
* CALL reg

    ```jsx
    0b00011000,<0000|source-register-addr>
    ```
* RET

    ```jsx
    0b00011001
    ```
* PUSH reg 

    ```jsx
    0b00001101,<0000|source-register-addr>
    0b10001101,<0000|source-register-addr>
    ```
* POP reg

    ```jsx
    0b00001101,<dest-register-addr|0000>
    0b10001101,<dest-register-addr|0000>
    ```
### CALL/RET




## TODO

* More instructions
    * ALU related
* Interrupt
    * Keyboard
    * Timer
* A display (that's why I'm testing in browser)