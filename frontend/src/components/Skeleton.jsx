import React from "react";

/**
 * Reusable loading skeleton components.
 * Usage: <Skeleton.Card />, <Skeleton.Table rows={5} />, <Skeleton.Stats count={4} />
 */

// Base skeleton block
const Block = ({ className = "" }) => (
  <div className={`skeleton ${className}`}>&nbsp;</div>
);

// Stats cards skeleton (like dashboard)
const Stats = ({ count = 4 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${count} gap-6 mb-8`}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-lg shadow-lg p-6 bg-gray-200 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-10 w-16 rounded" />
          </div>
          <div className="skeleton w-12 h-12 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

// Table skeleton
const Table = ({ rows = 5, cols = 5 }) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <div className="skeleton h-3 w-20 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <tr key={rIdx}>
              {Array.from({ length: cols }).map((_, cIdx) => (
                <td key={cIdx} className="px-6 py-4">
                  <div
                    className="skeleton h-4 rounded"
                    style={{ width: `${60 + Math.random() * 40}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Card skeleton
const Card = ({ lines = 3 }) => (
  <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
    <div className="space-y-3">
      <div className="skeleton h-5 w-3/4 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 rounded"
          style={{ width: `${50 + Math.random() * 50}%` }}
        />
      ))}
    </div>
  </div>
);

// Grid of card skeletons
const Cards = ({ count = 6, cols = 3 }) => (
  <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} lines={3} />
    ))}
  </div>
);

// Full page skeleton (stats + table)
const Page = () => (
  <div className="space-y-6">
    <Stats count={4} />
    <Table rows={5} cols={5} />
  </div>
);

const Skeleton = {
  Block,
  Stats,
  Table,
  Card,
  Cards,
  Page,
};

export default Skeleton;
