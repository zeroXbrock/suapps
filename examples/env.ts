import dotenv from "dotenv"
dotenv.config()

function loadEnv() {
    let SUAVE_KEY = process.env.SUAVE_KEY
    let GOERLI_KEY = process.env.GOERLI_KEY
    // prepend 0x if var exists and 0x is not present
    if (SUAVE_KEY && !SUAVE_KEY.startsWith("0x")) {
        SUAVE_KEY = "0x" + SUAVE_KEY
    }
    if (GOERLI_KEY && !GOERLI_KEY.startsWith("0x")) {
        GOERLI_KEY = "0x" + GOERLI_KEY
    }
    return {
        SUAVE_KEY,
        GOERLI_KEY,
    }
}

const env = loadEnv()
export default env
