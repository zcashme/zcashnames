/**
 * CollectionGraph — the whole collection as a single React Flow graph.
 *
 * Every name lands on one canvas. Names that share an owner form a constellation
 * (a star with its co-owned siblings); names with a different owner become their
 * own constellation in the same space. The address is never drawn — it's the
 * invisible glue between siblings. Tapping a node selects it, driving the detail
 * panel above.
 *
 * Nodes are our own React components, so the themed chips carry over verbatim;
 * React Flow owns the viewport (pan / fit-to-view) and interaction so we don't.
 */
"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CollectionCluster, CollectionName } from "@/lib/zns/collection";

// Keep node counts sane: a single constellation can breathe; many must share space.
function siblingCap(clusterCount: number): number {
  return clusterCount === 1 ? 16 : 8;
}

function anchorFor(i: number, k: number) {
  if (k <= 1) return { x: 0, y: 0 };
  const theta = (i / k) * Math.PI * 2 - Math.PI / 2;
  return { x: 200 * Math.cos(theta), y: 200 * Math.sin(theta) };
}

function starOf(cluster: CollectionCluster, selected: string | null): CollectionName {
  return (
    cluster.names.find((n) => n.name === selected) ??
    cluster.names.find((n) => n.isSeed) ??
    cluster.names[0]
  );
}

type NameNodeData = {
  name: CollectionName;
  variant: "star" | "node";
  selected: boolean;
};
type NameNode = Node<NameNodeData, "name">;

// The node renderer — our themed chip. Hidden handles give React Flow something
// to anchor the edges to without drawing connection dots.
function NameNodeView({ data }: NodeProps<NameNode>) {
  const { name, variant, selected } = data;
  const isStar = variant === "star";
  const isUnregistered = !!name.unregistered;
  const isHistorical = !!name.historical;
  return (
    <div
      title={isUnregistered ? `${name.name} — not registered yet` : isHistorical ? `${name.name} — historical link` : name.forSale ? `${name.name} — listed for sale` : name.name}
      className="inline-flex max-w-[9rem] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{
        background: isUnregistered ? "var(--home-result-status-positive-bg)" : "var(--color-raised)",
        opacity: isHistorical ? 0.5 : 1,
        borderStyle: isUnregistered ? "dashed" : isHistorical ? "dotted" : "solid",
        borderColor: selected
          ? "var(--hero-headline-accent)"
          : isUnregistered
            ? "var(--home-result-status-positive-fg)"
            : name.forSale
              ? "var(--home-result-status-forsale-border)"
              : "var(--leaders-card-border)",
        boxShadow: selected
          ? "0 0 0 2px var(--hero-headline-accent)"
          : isStar && !isUnregistered && !isHistorical
            ? "0 8px 22px rgba(0,0,0,0.2)"
            : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} isConnectable={false} />
      {name.forSale && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "var(--home-result-status-forsale-fg)" }}
          aria-hidden="true"
        />
      )}
      <span
        className={`truncate text-[0.8rem] ${isStar && !isUnregistered && !isHistorical ? "font-bold" : "font-semibold"}`}
        style={{ color: isUnregistered ? "var(--home-result-status-positive-fg)" : isStar && !isHistorical ? "var(--fg-heading)" : "var(--fg-muted)" }}
      >
        {name.name}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} isConnectable={false} />
    </div>
  );
}

const nodeTypes: NodeTypes = { name: NameNodeView };

export default function CollectionGraph({
  clusters,
  selected,
  onNameClick,
}: {
  clusters: CollectionCluster[];
  selected: string | null;
  onNameClick: (name: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const real = clusters.filter((c) => !c.names[0]?.unregistered);
    const ghosts = clusters.filter((c) => c.names[0]?.unregistered);
    const k = real.length;
    const cap = siblingCap(k);
    const nodes: NameNode[] = [];
    const edges: Edge[] = [];

    real.forEach((cluster, i) => {
      const anchor = anchorFor(i, k);
      const star = starOf(cluster, selected);
      const starId = `${cluster.key}:${star.name}`;
      nodes.push({
        id: starId,
        type: "name",
        position: anchor,
        data: { name: star, variant: "star", selected: star.name === selected },
        draggable: false,
      });

      const siblings = cluster.names.filter((n) => n !== star).slice(0, cap);
      const rx = k <= 1 ? 160 : 110;
      const ry = k <= 1 ? 110 : 85;
      siblings.forEach((sib, j) => {
        const angle = (j / siblings.length) * Math.PI * 2 - Math.PI / 2;
        const id = `${cluster.key}:${sib.name}`;
        nodes.push({
          id,
          type: "name",
          position: { x: anchor.x + rx * Math.cos(angle), y: anchor.y + ry * Math.sin(angle) },
          data: { name: sib, variant: "node", selected: sib.name === selected },
          draggable: false,
        });
        edges.push({
          id: `${starId}->${id}`,
          source: starId,
          target: id,
          type: "straight",
          style: { stroke: "var(--leaders-card-border)", strokeWidth: 1.5 },
        });
      });
    });

    // Unregistered singletons in a horizontal strip below the registered clusters.
    const stripY = k === 0 ? 0 : 260;
    const stripGap = 160;
    const stripOffsetX = ((ghosts.length - 1) / 2) * stripGap;
    ghosts.forEach((cluster, i) => {
      const ghost = cluster.names[0];
      nodes.push({
        id: `${cluster.key}:${ghost.name}`,
        type: "name",
        position: { x: i * stripGap - stripOffsetX, y: stripY },
        data: { name: ghost, variant: "node", selected: ghost.name === selected },
        draggable: false,
      });
    });

    return { nodes, edges };
  }, [clusters, selected]);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)", height: 480 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNameClick((node as NameNode).data.name.name)}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.5 }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: false }}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--leaders-card-border)" />
      </ReactFlow>
    </div>
  );
}
