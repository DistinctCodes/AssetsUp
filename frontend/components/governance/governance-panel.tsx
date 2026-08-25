"use client";

import { useState } from "react";
import { Vote, CheckCircle, XCircle, Clock } from "lucide-react";

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: "active" | "passed" | "rejected" | "executed";
  deadline: string;
  votesFor: number;
  votesAgainst: number;
  threshold: number;
  totalTokens: number;
}

interface ProposalsListProps {
  proposals: Proposal[];
  userTokenBalance: number;
  onVote: (proposalId: string, support: boolean) => Promise<void>;
}

export function ProposalsList({
  proposals,
  userTokenBalance,
  onVote,
}: ProposalsListProps) {
  return (
    <div className="space-y-3">
      {proposals.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Vote size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No proposals yet</p>
        </div>
      ) : (
        proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            userTokenBalance={userTokenBalance}
            onVote={onVote}
          />
        ))
      )}
    </div>
  );
}

function ProposalCard({
  proposal,
  userTokenBalance,
  onVote,
}: {
  proposal: Proposal;
  userTokenBalance: number;
  onVote: (proposalId: string, support: boolean) => Promise<void>;
}) {
  const [isVoting, setIsVoting] = useState(false);
  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;
  const thresholdPercentage =
    proposal.totalTokens > 0
      ? (totalVotes / proposal.totalTokens) * 100
      : 0;

  const statusConfig = {
    active: { color: "bg-blue-50 text-blue-700", icon: Clock, label: "Active" },
    passed: { color: "bg-green-50 text-green-700", icon: CheckCircle, label: "Passed" },
    rejected: { color: "bg-red-50 text-red-700", icon: XCircle, label: "Rejected" },
    executed: { color: "bg-gray-50 text-gray-700", icon: CheckCircle, label: "Executed" },
  };

  const config = statusConfig[proposal.status];
  const StatusIcon = config.icon;

  const handleVote = async (support: boolean) => {
    setIsVoting(true);
    try {
      await onVote(proposal.id, support);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{proposal.title}</h3>
        <span
          className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}
        >
          <StatusIcon size={12} />
          {config.label}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
        {proposal.description}
      </p>

      <div className="text-xs text-gray-400 mb-3">
        Proposed by {proposal.proposer} · Deadline:{" "}
        {new Date(proposal.deadline).toLocaleDateString()}
      </div>

      {/* Tally */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-green-600">
            For: {proposal.votesFor.toLocaleString()}
          </span>
          <span className="text-red-600">
            Against: {proposal.votesAgainst.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full"
            style={{ width: `${forPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-1 text-gray-400">
          <span>{forPercentage.toFixed(1)}% in favor</span>
          <span>
            Threshold: {thresholdPercentage.toFixed(1)}% /{" "}
            {proposal.threshold}%
          </span>
        </div>
      </div>

      {/* Vote buttons */}
      {proposal.status === "active" && userTokenBalance > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Vote For
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Vote Against
          </button>
        </div>
      )}

      {proposal.status === "active" && userTokenBalance === 0 && (
        <p className="text-xs text-gray-400 text-center">
          You need tokens to vote on this proposal
        </p>
      )}
    </div>
  );
}

interface CreateProposalFormProps {
  onSubmit: (title: string, description: string) => Promise<void>;
}

export function CreateProposalForm({ onSubmit }: CreateProposalFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      await onSubmit(title, description);
      setTitle("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Create Proposal
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Proposal title"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the proposal..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title || !description}
          className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Proposal"}
        </button>
      </div>
    </form>
  );
}
