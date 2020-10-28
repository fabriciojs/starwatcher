const sleep = require('then-sleep')
const got = require('got')
const ms = require('ms')

const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '2m'
const REPO = process.env.REPO || 'zeit/hyper'
const NOTIFY_INTERVAL = process.env.NOTIFY_INTERVAL || 1
const INCOMING_WEBHOOK_URL = process.env.INCOMING_WEBHOOK_URL
const NOTIFICATION_CHANNEL = process.env.NOTIFICATION_CHANNEL
const NOTIFICATION_USERNAME = process.env.NOTIFICATION_USERNAME || 'StarWatcher'

const INTERVAL = ms(CHECK_INTERVAL)
const REPO_URL = `https://github.com/${REPO}`
const API_URL = `https://api.github.com/repos/${REPO}`

let stars = 0
let loop = true
const stats = {
  lastChange: null,
  lastNotification: null
}

const notify = async () => {
  if (!INCOMING_WEBHOOK_URL) {
    console.log('No INCOMING_WEBHOOK_URL provided; nothing to watch for')
    return
  }
  const payload = {
    text: `<${REPO_URL}|*${REPO}*> just reached ${stars} :star:`,
    icon_emoji: ':star:',
    username: NOTIFICATION_USERNAME
  }
  if (NOTIFICATION_CHANNEL) {
    payload['channel'] = NOTIFICATION_CHANNEL
  }
  try {
    await got.post(INCOMING_WEBHOOK_URL, {
      body: JSON.stringify(payload)
    })
    console.log(`Notification sent: ${payload.text}`)
  } catch (e) {
    console.error('Notification failed', e)
  }
}

const getStars = async () => {
  try {
    const response = await got(API_URL, {
      json: true
    })
    const {stargazers_count} = response.body
    return stargazers_count
  } catch (e) {
    console.error(e)
    return stars
  }
}

const main = async () => {
  // Init
  let count = await getStars()
  stars = count
  console.log(`Watching from ${stars}`)
  while (loop) {
    console.log(`Waiting ${INTERVAL}ms`)
    await sleep(INTERVAL)
    count = await getStars()

    if (stars === count) {
      console.log(`Same Stars count: ${count}`)
      continue
    }
    console.log(`Stars count changed: ${stars} -> ${count}`)
    stats.lastChange = new Date()
    stars = count
    if (stars % NOTIFY_INTERVAL === 0) {
      notify()
      stats.lastNotification = new Date()
    }
  }
}
main()

module.exports = async (req, res) => {
  const count = stars || (await getStars())

  return count
}
