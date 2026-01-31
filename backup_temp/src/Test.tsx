import { Button } from '@mui/material';

const Test = () => {

    const handleClick = () => {
        const worker = new Worker('./myWorker.ts');
        worker.onmessage = (e) => {
            console.log("Message from worker: ", e.data);
        }
    }

    return (
        <Button onClick={handleClick}>Test Worker</Button>
    )
}

export default Test
