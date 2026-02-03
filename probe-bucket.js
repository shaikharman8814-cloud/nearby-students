
const bucketNames = ["nearbystudents.firebasestorage.app"];

async function checkBucket(name) {
    const url = `https://firebasestorage.googleapis.com/v0/b/${name}/o`;
    console.log(`Checking: ${name}`);
    try {
        const res = await fetch(url);
        console.log(`  Status: ${res.status} ${res.statusText}`);
        if (res.status !== 404) {
            console.log(`  SUCCESS! BUCKET FOUND: ${name}`);
        }
    } catch (err) {
        console.log(`  Error: ${err.message}`);
    }
}

async function run() {
    for (const name of bucketNames) {
        await checkBucket(name);
    }
}

run();
