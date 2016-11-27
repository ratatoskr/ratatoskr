interface ClusterDirectory {
    updateCluster(): Promise<void>;
    syncNodeDirectory(): Promise<void>;
    updateNodeEntry(): Promise<void>;
}

export default ClusterDirectory;
export { ClusterDirectory };