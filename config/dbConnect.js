const { default: mongoose } = require("mongoose")

const dbConnect = () => {
    try {
        const conn = mongoose.connect(process.env.MONGODB);
        console.log('Database Connected Successfully');
    } catch (error) {
        console.log(`Database Connect Error ${error}`)
    }
}

module.exports = dbConnect;