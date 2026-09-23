# openrouter-api

Unrestricted OpenRouter proxy API. Raw passthrough. No filtering.

## deploy to vercel

1. push this repo to github
2. go to vercel.com → new project → import repo
3. add environment variables:
   - `OPENROUTER_KEY` = your openrouter key
   - `SITE_URL` = your vercel url (optional)
   - `SITE_NAME` = openrouter-api (optional)
4. deploy

done. endpoint live at: `https://your-app.vercel.app/api/chat`

## usage

POST `/api/chat`

```json
{
  "messages": [
    { "role": "system", "content": "you are a direct assistant" },
    { "role": "user", "content": "hello" }
  ],
  "stream": true,
  "model": "deepseek/deepseek-chat"
}
