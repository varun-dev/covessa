async function App(bookingId, apikey) {
  if (!bookingId) return 'Booking ID is missing'
  if (!apikey) return 'apikey missing'

  const urlToken = 'https://europe-west3-covessa-sql.cloudfunctions.net/covessa-mq-dev-covessamq'
  // const url = 'http://localhost:8080'
  const urlApi = 'https://pubsub.googleapis.com/v1'

  const project = 'projects/covessa-sql'
  const subName = `${project}/subscriptions/booking-sub-${bookingId.value}`
  const topicName = `${project}/topics/booking-topic-${bookingId.value}`
  const urlSub = `${urlApi}/${subName}`
  const urlTopic = `${urlApi}/${topicName}`

  try {
    const resp = await fetch(urlToken + '?apikey=' + apikey.value)
    const headers = await resp.json()
    const msgs = await getMessages(headers)
    console.log('msgs', msgs)
    if (!msgs || !msgs.length) return 'No booking'
    await deleteTopic(headers)
    return msgs[0].message.attributes.bookingId
  } catch (e) {
    console.error(e)
  }

  async function getMessages(headers) {
    const url = urlSub + ':pull'
    const body = JSON.stringify({
      returnImmediately: false,
      maxMessages: 10,
    })
    const resp = await fetch(url, { headers, body, method: 'POST' })
    const r = await resp.json()
    // console.log('pull response', r)
    return r.receivedMessages
  }

  async function ackMessages(headers, messages) {
    const url = urlSub + ':acknowledge'
    const body = JSON.stringify({
      ackIds: messages.map(m => m.ackId),
    })
    await fetch(url, { headers, body, method: 'POST' })
  }

  async function deleteTopic(headers) {
    try {
      await fetch(urlSub, { headers, method: 'DELETE' })
      await fetch(urlTopic, { headers, method: 'DELETE' })
    } catch (e) {
      console.error(e)
    }
  }
}

window.__function = App
