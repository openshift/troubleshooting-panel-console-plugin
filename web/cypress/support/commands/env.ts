const kubeconfigPath = Cypress.env('KUBECONFIG_PATH');
if (!kubeconfigPath) {
  throw new Error('Missing required Cypress env: KUBECONFIG_PATH');
}
export const admKubeconfig: string = kubeconfigPath;
export const tmpKubeconfig = "/tmp/normal_kubeconfig"
export const Rank = {
  toIndex: {
    first: 0,
    second: 1,
    third: 2,
    fourth: 3,
    fifth: 4,
  }
};
