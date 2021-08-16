async function App(bookingId, apikey) {
  if (!bookingId.value) return 'Booking ID is missing'
  if (!apikey.value) return 'apikey missing'

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
    const msg = await getMessage(headers, 4)
    console.log('msg', msg)
    // await deleteTopic(headers)
    return msg
  } catch (e) {
    console.error(e)
  }

  async function getMessage(headers, retry) {
    console.log('Pulling message for', subName)
    const url = urlSub + ':pull'
    const body = JSON.stringify({
      returnImmediately: false,
      maxMessages: 10,
    })
    const resp = await fetch(url, { headers, body, method: 'POST' })
    const r = await resp.json()
    console.log('pull response', r)
    const msgs = r.receivedMessages
    if (!msgs || !msgs.length) {
      if (retry > 0) {
        return await getMessage(headers, retry - 1)
      } else {
        return 'No booking'
      }
    } else {
      return msgs[0].message.attributes.bookingId
    }
  }

  async function ackMessages(headers, messages) {
    const url = urlSub + ':acknowledge'
    const body = JSON.stringify({
      ackIds: messages.map(m => m.ackId),
    })
    await fetch(url, { headers, body, method: 'POST' })
  }

  async function deleteTopic(headers) {
    console.log('Cleaning up')
    try {
      await fetch(urlSub, { headers, method: 'DELETE' })
      await fetch(urlTopic, { headers, method: 'DELETE' })
    } catch (e) {
      console.error(e)
    }
  }
}

window.__function = App
