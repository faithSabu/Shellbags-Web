const mongoClient = require('mongodb').MongoClient;
const state = {
    db: null
}
module.exports.connect = (done) => {
    const url = 'mongodb+srv://faithSabu:Faith2023@cluster0.3mrz2l8.mongodb.net/test'
    // const url = 'mongodb://localhost:27017'
    const dbname = 'SHELLBAGS'

    mongoClient.connect(url,(err,data) => {
        if(err) return done(err)
        state.db = data.db(dbname)
        done()
    })
}

module.exports.get = () => {
    return state.db;
}