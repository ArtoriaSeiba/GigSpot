This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Repertoire And Rehearsal

For an existing MySQL database, apply the additive song columns once and regenerate Prisma Client, then restart the app.

```sh
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/add-song-rehearsal.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/add-song-recording-metadata.sql
npx prisma generate
```

In **Repertoire → Add Song**, type a title and choose a recording from the iTunes catalog to fill the title, artist, album, year, and duration when available. The catalog uses Malaysia by default. Set `SONG_CATALOG_COUNTRY` to a two-letter country code to use another storefront. Use **Add Manually** for songs outside the catalog.

Open **Arrangement, Chart & Notes** to paste a chart, import from a link, or change the band key and tempo. Enter the key of the written chord shapes and the chart's capo fret together. For example, C shapes with capo 5 sound in F. The band preview uses concert pitch, while rehearsal details can show the original guitar shapes with their capo. Band members can read the chart and notes in Repertoire, from the gig setlist, or in Rehearsal.

- For automatic key and BPM, add a server-side `FREQBLOG_API_KEY` or `GETSONGBPM_API_KEY` and restart the app. FreqBlog has a free non-commercial tier and can match an iTunes recording by ID, or by title, artist, album and duration. If analysis is still running, the editor lets you check again or save with the details blank. [FreqBlog API](https://freqblog.com/) [GetSongBPM API](https://getsongbpm.com/api)
- To try chord links, create a Jam Jam key with `convert:read` and `convert:write` in **Settings → API keys**, add it as `JAM_JAM_API_KEY` in your private `.env`, and restart GigSpot. In the song editor, open **Arrangement, Chart & Notes → Import From A Link**. Paste a public chart URL you can share and review the chord sequence before adding it to the draft. Jam Jam returns concert-pitch chords, and GigSpot uses the capo metadata to restore the written guitar shapes. The selected recording’s original key and tempo stay separate from the chart. [Jam Jam Developer API](https://jam-jam.org/developers/)
- To enable optional, usage-billed audio analysis, set `MUSIC_AI_API_KEY` and `MUSIC_AI_WORKFLOW` to the secret and the slug of a published workflow using the Chords and Beats modules. Name its input `inputFileUrl`, or set `MUSIC_AI_INPUT_NAME` to the workflow’s input name. Expose outputs named `key`, `bpm`, and `chordMap`. Use Music AI’s managed storage for the signed upload and chord map. The app takes a recording up to 20 MB, subject to your host’s own request limit. Results land in an editable draft for the admin to review and save. [Music AI Workflow](https://music.ai/workflows/transcription-and-alignment/chords-and-beat-mapping/) [Pricing](https://music.ai/pricing/)

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
