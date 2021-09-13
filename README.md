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
    * Aligned access only.
* 2 general purpose register. (can expand easily).
* Variable instruction cycle. (from 2 to IDK)
* Variable machine code length. (from 2 to IDK)

### Instructions
Current it can only do:
* Copy data between immediate/register/memery
* Add/Substract
* Halt and do nothing

#### Layout
* 2*_n_ bytes
* 1st byte : instruction
* 2n byte : register address (can be 0 if no register involved)(ok I mean wasted)
    * 1st 4-bits is destination, followed by 4-bits source.
    * Reg A: 0b0001
    * Reg B: 0b0010
* others: immediate

#### HALT
```jsx
0b00001111,<not-used>
```

#### MOV [dest],[source]

* Move imm to reg
    ```jsx
    0b00001000,<register-addr>,<immediate-l>,<immediate-h>
    ```
* Move reg to reg
    ```jsx
    0b00001001,<register-addr>
    ```
* Move mem to reg
    ```jsx
    0b00001010,<register-addr>,<addr-l>,<addr-h>
    ```
* Move reg to mem
    ```jsx
    0b00001011,<register-addr>,<addr-l>,<addr-h>
    ```
#### ADD/SUB [dest],[source]
* Add accumulator (A register) with [source] (register) and store the result in [dest] (register)
    ```jsx
    0b00000100,<register-addr>
    ```
* Substract: similar to add.
    ```jsx
    0b00000101,<register-addr>
    ```
## TODO

* More instructions
    * Stack
    * ALU related
* Interrupt
    * Keyboard
    * Timer
* A display (that's why I'm testing in browser)