import express from "express"
import multer from "multer"
import { BskyAgent } from "@atproto/api"

const app = express()
const upload = multer({ dest: "uploads/" })

app.post("/upload", upload.single("image"), async (req,res)=>{

const agent = new BskyAgent({
service: "https://bsky.social"
})

await agent.login({
identifier: "yourhandle.bsky.social",
password: "APP_PASSWORD"
})

const img = fs.readFileSync(req.file.path)

const blob = await agent.uploadBlob(img)

await agent.post({
text: "Posted from CrakkoCat 3DS Image Share!",
embed:{
$type:"app.bsky.embed.images",
images:[{image:blob.data.blob, alt:"3DS screenshot"}]
}
})

res.send("Uploaded to Bluesky!")
})

app.listen(3000)
