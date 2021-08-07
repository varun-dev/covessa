window.__function = async function ({apikey}) {
  const url = 'https://europe-west3-covessa-sql.cloudfunctions.net/covessa-mq-dev-covessamq'
  // const url = 'http://localhost:8080'

  const apiUrl =
      'https://pubsub.googleapis.com/v1/projects/covessa-sql/subscriptions/acuity-new-booking-sub'

  // get token
  const resp = await fetch (url+ '?apikey='+apikey)
  const r = await resp.json()
  console.log('token',r)

  const messages = await getMessages(r)

  return messages

  async function getMessages(headers) {
    const url = apiUrl + ':pull'

    const body = JSON.stringify({
      returnImmediately: false,
      maxMessages: 10,
    })

    const resp = await fetch(url, { headers, body, method: 'POST' })
    const r = await resp.json()
    console.log('pull response', r)
    await ackMessages(headers, r.receivedMessages)
    return r.receivedMessages
  }

  async function ackMessages(headers, messages) {
    if (!messages || !messages.length) return
    const url = apiUrl + ':acknowledge'
    const body = JSON.stringify({
      ackIds: messages.map(m => m.ackId),
    })

    const resp = await fetch(url, { headers, body, method: 'POST' })
    console.log('ackResp', await resp.json())
  }
}
