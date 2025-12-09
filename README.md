# Sendbird-Chat-SDK-for-JavaScript

Sendbird Chat SDK for JavaScript use Tailwind CSS v4 with Vue and Flowbite.

## Profanity filter

This project applies a small client-side profanity filter for outgoing messages. If the message contains the Vietnamese word "chửi" it will be replaced with `***` before sending and before it appears in the UI preview.

How to test:
- Open the app, type a message containing the word "chửi", and press Send (or Enter).
- The message that gets sent and shown in the chat preview will show `***` in place of "chửi".