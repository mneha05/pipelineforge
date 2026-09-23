ClusterDashboard.mainPage = SC.Page.design({
  mainPane: SC.MainPane.design({
    childViews: ['title', 'status'],

    title: SC.LabelView.design({
      layout: { top: 40, left: 40, right: 40, height: 44 },
      value: 'PipelineForge / SproutCore compatibility console',
      fontWeight: SC.BOLD_WEIGHT,
      fontSize: 22
    }),

    status: SC.LabelView.design({
      layout: { top: 105, left: 40, right: 40, height: 30 },
      valueBinding: 'ClusterDashboard.statusController.statusText'
    })
  })
});

ClusterDashboard.main = function () {
  ClusterDashboard.getPath('mainPage.mainPane').append();
};
