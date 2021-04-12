import * as core from '@actions/core'
import {context} from '@actions/github'
import {Octokit} from '@octokit/rest'

async function run(): Promise<void> {
  const titlePrefix = '[SyncYourFork]'
  const owner = core.getInput('owner', {required: false}) || context.repo.owner
  const base = core.getInput('base', {required: false})
  const head = core.getInput('head', {required: false})
  const mergeMethod = core.getInput('merge_method', {required: false})
  const prTitle = `${titlePrefix} ${core.getInput('pr_title', {
    required: false
  })}`
  const prMessage = core.getInput('pr_message', {required: false})

  const octokit = new Octokit()

  try {
    const ownerHead = `${owner}:${head}`

    const {data: pullsFromUpstream} = await octokit.pulls.list({
      owner: context.repo.owner,
      repo: context.repo.repo,
      state: 'open',
      head: ownerHead,
      base,
      sort: 'created'
    })

    const thisActionsPRs = pullsFromUpstream.filter(pr =>
      pr.title.startsWith(titlePrefix)
    )

    const numOpenSyncPRs = thisActionsPRs.length

    if (numOpenSyncPRs > 1)
      core.warning(
        'Multiple pulls from this action. This is not ' +
          'supposed to happen. Using last created PR.'
      )

    if (numOpenSyncPRs > 0) {
      core.info(`Sync PR #${thisActionsPRs[0].number} already open.`)
      return
    }

    const {data: pr} = await octokit.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: prTitle,
      head: ownerHead,
      base,
      body: prMessage,
      merge_method: mergeMethod,
      maintainer_can_modify: false
    })

    core.info(`Sync PR #${pr.number} created.`)
  } catch (error) {
    if (
      error?.errors?.[0]?.message &&
      error.errors[0].message.startsWith('No commits between')
    ) {
      core.info(
        `No commits between ${context.repo.owner}:${base} and ` +
          `${owner}:${head}`
      )
    } else {
      core.setFailed(`Failed to create or merge pull request: ${error}`)
    }
  }
}

run()
