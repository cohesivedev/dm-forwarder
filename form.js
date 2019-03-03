function sendTestForm(res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`
        <form action="" method="post" onsubmit="document.getElementById(1).value=btoa(document.getElementById(1).value)">
            <textarea id=1 name="msg"></textarea>
            <input type="submit">
        </form>
`);
}

module.exports = {
    sendTestForm
};