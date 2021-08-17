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

  const PULL_RETRIES = 5
  const NOT_FOUND_RETRY_DELAY = 2000

  let headers

  try {
    const resp = await fetch(urlToken + '?apikey=' + apikey.value)
    headers = await resp.json()
    await initialise()
    const msg = await getMessage(PULL_RETRIES - 1)
    console.debug('Response: ', msg)
    await destroy()
    return msg
  } catch (e) {
    console.debug(e)
    return 'Error: ' + e.message
  }

  async function getMessage(retry) {
    console.debug('Pulling message for', bookingId.value)
    const url = urlSub + ':pull'
    const body = JSON.stringify({
      returnImmediately: false,
      maxMessages: 10,
    })

    const resp = await fetch(url, { headers, body, method: 'POST' })
    if (resp.status === 200) {
      const { receivedMessages } = await resp.json()
      console.debug('receivedMessages', receivedMessages)
      if (!receivedMessages || !receivedMessages.length) {
        if (retry > 0) {
          return await getMessage(retry - 1)
        } else {
          return 'No booking'
        }
      } else {
        return receivedMessages[0].message.attributes.bookingId
      }
    } else if (resp.status === 404) {
      setTimeout(getMessage.bind(null, retry), NOT_FOUND_RETRY_DELAY)
    } else {
      return 'Error ' + resp.status
    }
  }

  async function ackMessages(messages) {
    const url = urlSub + ':acknowledge'
    const body = JSON.stringify({
      ackIds: messages.map(m => m.ackId),
    })
    await fetch(url, { headers, body, method: 'POST' })
  }

  async function destroy() {
    console.debug('Destroying topic and subscription')
    try {
      await fetch(urlSub, { headers, method: 'DELETE' })
      await fetch(urlTopic, { headers, method: 'DELETE' })
    } catch (e) {
      console.debug(e)
    }
  }

  async function initialise() {
    console.debug('Creating topic and subscription')
    const respTopic = await fetch(urlTopic, { headers, method: 'PUT' })
    if (respTopic.status === 409) console.debug('Topic already exist. This should not happen')
    const body = JSON.stringify({ topic: topicName })
    const respSub = await fetch(urlSub, { headers, method: 'PUT', body })
    if (respSub.status === 409) console.debug('Subscription already exist. This should not happen')
  }
}

window.__function = App
