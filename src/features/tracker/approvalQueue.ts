import type { CompletionRequest, Profile, Project } from '../../types/domain'
import { getPendingRequests, getProjects } from './trackerService'
import { getWorkProposals, type WorkProposal } from './workProposalService'
import { canReviewCompletionRequest, proposalReviewProjects } from './approvalScope'

export type ProposalQueueItem = WorkProposal & { project: Pick<Project, 'id' | 'code' | 'name'> }

export interface ApprovalQueue {
  completionItems: CompletionRequest[]
  proposalItems: ProposalQueueItem[]
}

export function approvalQueueCount(queue: ApprovalQueue) {
  return queue.completionItems.length + queue.proposalItems.length
}

export async function getApprovalQueue(profile: Profile): Promise<ApprovalQueue> {
  const projects = await getProjects()
  const managedProjectIds = new Set(projects.filter((project) => project.can_manage).map((project) => project.id))
  const [requests, proposalGroups] = await Promise.all([
    getPendingRequests(),
    Promise.all(proposalReviewProjects(projects, profile.role === 'manager').map(async (project) =>
      (await getWorkProposals(project.id))
        .filter((proposal) => proposal.status === 'pending')
        .map((proposal) => ({ ...proposal, project })),
    )),
  ])
  return {
    completionItems: requests.filter((item) => canReviewCompletionRequest(item, profile, managedProjectIds)),
    proposalItems: proposalGroups.flat().sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)),
  }
}
