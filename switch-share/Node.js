const express = require("express")
const multer = require("multer")
const app = express()

const upload = multer({ dest: "uploads/" })

app.post("/upload", upload.single("image"), (req, res) => {

console.log("Image received:", req.file)

const platform = req.body.platform

if(platform === "bluesky"){
    console.log("Posting to Bluesky...")
}

res.send("Upload successful!")

})

app.listen(3000, () => {
console.log("Server running on port 3000")
})
