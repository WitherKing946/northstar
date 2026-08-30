import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPathNodes, markNodeDone } from '@/api/client';
import type { PathOut, PathNode } from '@/api/types';
import { useLearner } from '@/context/LearnerContext';
import { StatusWrapper } from '@/components/StatusWrapper/StatusWrapper';
import { NodeCard } from '@/components/NodeCard/NodeCard';
import { ChatPanel } from '@/components/ChatPanel/ChatPanel';
import styles from './RoadmapView.module.css';

export default function RoadmapView() {
  const { pathId } = useParams<{ pathId: string }>();
  const { learner } = useLearner();
  const [path, setPath] = useState<PathOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<PathNode | null>(null);

  const fetchNodes = async () => {
    if (!pathId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getPathNodes(pathId);
      setPath(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch roadmap.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathId]);

  const handleMarkDone = async (position: number) => {
    if (!pathId) return;
    try {
      await markNodeDone(pathId, position);
      await fetchNodes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark node as done.';
      setError(message);
    }
  };

  const handleSelectNode = (node: PathNode) => {
    setSelectedNode(node);
  };

  const closePanel = () => {
    setSelectedNode(null);
  };

  const nodes = path?.nodes ?? [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Your Learning Roadmap</h1>
        {path && (
          <div className={styles.pathMeta}>
            <span className={styles.goalLabel}>{path.goal}</span>
            <span className={styles.badge}>{path.status}</span>
          </div>
        )}
      </header>

      <StatusWrapper loading={loading} error={error} empty={nodes.length === 0} emptyMessage="No steps found in this roadmap.">
        <div className={styles.layout}>
          <div className={styles.timeline}>
            {nodes.map((node, index) => (
              <div key={node.id} className={styles.timelineItem}>
                <div className={styles.timelineLine}>
                  <div className={`${styles.dot} ${node.status === 'done' ? styles.dotDone : ''}`} />
                  {index < nodes.length - 1 && <div className={styles.line} />}
                </div>
                <div className={`${styles.cardWrapper} ${selectedNode?.id === node.id ? styles.selected : ''}`}>
                  <NodeCard node={node} onMarkDone={handleMarkDone} onSelect={handleSelectNode} />
                </div>
              </div>
            ))}
          </div>

          {selectedNode && (
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>{selectedNode.resource.title}</h2>
                <button className={styles.closeBtn} onClick={closePanel}>&times;</button>
              </div>
              <div className={styles.panelContent}>
                <h3>Why this step?</h3>
                <blockquote className={styles.reasonQuote}>
                  "{selectedNode.reason}"
                </blockquote>

                <div className={styles.resourceDetails}>
                  <h3>Resource Details</h3>
                  <p><strong>Type:</strong> {selectedNode.resource.type}</p>
                  <p><strong>Estimated time:</strong> {selectedNode.resource.est_hours} hours</p>
                  {selectedNode.resource.url && (
                    <p>
                      <a href={selectedNode.resource.url} target="_blank" rel="noopener noreferrer">
                        Open resource →
                      </a>
                    </p>
                  )}
                  {selectedNode.resource.skills_taught.length > 0 && (
                    <div className={styles.skillChips}>
                      {selectedNode.resource.skills_taught.map((skill) => (
                        <span key={skill} className={styles.chip}>{skill}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.chatSection}>
                  <h3>Ask Questions</h3>
                  {learner && <ChatPanel learnerId={learner.id} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </StatusWrapper>
    </div>
  );
}
