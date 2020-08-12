import dotenv from "dotenv";
import fs from "fs";
import express from "express";
import session from 'express-session';
import http from "http";
import https from "https";
// @ts-expect-error
import memoryStore from "memorystore";

dotenv.config();

const MemoryStore = memoryStore(session);
const app = express();


const authenticated = (req: any, res: any, next: any) => {
    if (req.session.authenticated) next();
    else res.status(403).send();
}

const getPath = () => {
    const dateString = new Date(Date.now()).toISOString().substr(0, 10);
    const path = `${__dirname}/${process.env.NOTESPATH}/${dateString}.txt`;
    return path;
}


app.use(express.text());
app.use(session({
    cookie: { maxAge: 86400000 * 7 },
    store: new MemoryStore({
      checkPeriod: 86400000 * 7 // prune expired entries every 24h
    }),
    secret: 'drama llama'
}));


app.post("/login", (req: any, res: any) => {
    if (req.session.authenticated) {
        res.sendStatus(200);
        return;
    }

    if (req.body === process.env.PASSWORD) {
        req.session.authenticated = true;
        res.sendStatus(200);
    }
    else {
        res.sendStatus(403);
    }
});

app.get("/notes", authenticated, (req: any, res: any) => {
    const path = getPath();

    fs.exists(path, exists => {
        if (exists) {
            fs.readFile(path, {}, (err, data) => {
                if (err) {
                    throw err;
                }
                res.send(data);
            });
        }
        else {
            fs.readdir(`${__dirname}/${process.env.NOTESPATH}`, {}, (err, files) => {
                if (err) {
                    throw err;
                }
                const mostRecentPath = `${__dirname}/${process.env.NOTESPATH}/${files.sort()[files.length - 1]}`;
                fs.copyFile(mostRecentPath, path, (err) => {
                    if (err) {
                        throw err;
                    }
                    fs.readFile(path, {}, (err, data) => {
                        if (err) {
                            throw err;
                        }
                        res.send(data);
                    });
                });
            });
        }
    });
});

app.post("/notes", authenticated, (req: any, res: any) => {
    const path = getPath();
    fs.writeFile(path, req.body, {}, err => {
        if (err) {
            throw err;
        }
        res.sendStatus(200);
    });
});

var port = Number.parseInt(process.env.PORT);

if (process.env.production) {
    https.createServer(app).listen(port , () => {
        console.log(`HTTPS server started, port ${port}`);
    });
}
else {
    http.createServer(app).listen(port, () => {
        console.log(`HTTP server started, port ${port}`);
    });
}