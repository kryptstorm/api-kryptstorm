# Coding notice

## DB

- Sequelizejs will run validation, not matter you put true or false. So, if you want validation was run only at a field was not empty, unset it will solve

## Code

- That was a silly trivial issue, but took a lot of time to find out. When the secret was read from a file, it was appending an LF (linefeed) char to the string. So, when the same secret was hard-coded, it was without the LF. That explains the difference. [JWT Error](https://stackoverflow.com/questions/35798578/jsonwebtoken-verify-fails-when-the-secret-is-directly-provided-in-the-program)