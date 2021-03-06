import React from 'react';
import $ from 'jquery';
import Immutable from 'immutable';
import globalConfig from '../../globalConfig.json';
import util from '../util';

import Header from '../components/header';
import Navigate from '../components/navigate';
import ListOps from '../components/listOps';
import Table from '../components/table';
import Footer from '../components/footer';
import MaskModal from '../components/maskModal';

class DraftManage extends React.Component {
    constructor(props){
        super(props);
        
        let oaUser = util.getOaUser();

        if (!oaUser) {
            window.location.href = '/';
        }

        this.state = {    
        };
        this.option = {
            page: 1
        };
        this.dataToOp = {

        };
        this._bind.apply(this, ['onRowClick', 'onRowSelect', 'onSelectAll', 'getTableData', 'onPageChange', 'doDelete', 'doCheck', 'closeModal', 'ensureDelete', 'renderModal']);
    }

    _bind (...methods) {
        methods.forEach( (method)=> this[method] = this[method].bind(this));
    }

    onRowClick (row) {
        window.open(`#/newInfo/${row.id}`);
    }

    onRowSelect (row, isSelected) {
        if (isSelected) {
            this.dataToOp[row.id] = row;
        }
        else {
            delete this.dataToOp[row.id];
        }
    }

    onSelectAll (isSelected) {
        if (isSelected) {
            let i = 0, list = this.state.list, len = list.length, row;
            for (; i < len; i++) {
                row = list[i];
                this.dataToOp[row.id] = row;
            }            
        }
        else {
            this.dataToOp = {};
        }
    }

    getTableData (option) {
        var _this = this, url = `${globalConfig.baseUrl}/api/articles`;

        this.option = option;   // listFilter 查询时，缓存查询条件，翻页时用

        $.getJSON(url, option, function(json, textStatus) {
            if (0 != json.errCode) {
                return;
            }

            let list = json.data.map((item, i) => {
                item.statusName = '草稿中';
                item.columnName = item.columnsInfo[0].title;
                item.ctime = util.dateStrFromUnix(item.createTime);

                return item;
            });

            _this.setState({
                list: list,
                total: json.total
            });
        });
    }

    onPageChange (page, sizePerPage) {
        this.option.page = page;
        this.getTableData(this.option);
    }

    ensureDelete () {
        this.doCheck(100);
        this.closeModal();
    }

    closeModal () {
        this.refs.MaskModal && this.refs.MaskModal.close();
    }

    doDelete () {
        if (this.dataToOp && $.isEmptyObject(this.dataToOp)) {
            this.refs.listOps.showToast();
            return;
        }

        this.refs.MaskModal && this.refs.MaskModal.open();
    }

    doCheck (nextStatus = 100) {
        let listOps = this.refs.listOps, dataToOp = this.dataToOp;
        let opName = {'11': '通过初审', '30': '通过复审', '100': '删除条目'}[nextStatus];

        if (listOps.state.showToast) {
            return;  // 避免重复操作
        }

        if (dataToOp && $.isEmptyObject(dataToOp)) {
            listOps.showToast();
            return;
        }
        else {
            listOps.showToast(`正在${opName}，请稍候...`, true);
        }

        let _this = this, key, row, size = 0, statusToOp = {'11': 10, '30': 11, '100': 100};

        for (key in dataToOp) {
            row = dataToOp[key];
            if ((100 != nextStatus && row.status != statusToOp[nextStatus]) || (100 == nextStatus && row.status == 100)) {    // 删除条目时，不用判断状态(已经是删除状态的除外)
                continue;
            }

            size++;

            $.ajax({
                url: `${globalConfig.baseUrl}/api/article/${row.id}`, 
                type: 'PUT',
                dataType: 'json', 
                contentType: 'application/json', 
                data: JSON.stringify({status: nextStatus})
            })
            .always(() => {
                size--;
                if (0 == size) {
                    listOps.showToast(`${opName}操作完成`);
                    setTimeout(() => {
                        this.onPageChange(1); // 全部返回后，刷新列表
                    }, 2000);
                }
            }); 
        };

        if (0 == size) {
            listOps.showToast(`${opName}操作完成`);
            setTimeout(() => {
                this.onPageChange(1);   // 取消选中态
            }, 2000);
        }

        this.dataToOp = {};
    }

    componentDidMount() {
        this.getTableData({page: 1, pageSize: globalConfig.pageSize || 20, status: 1});
    }

    componentWillUnmount() {
        
    }

    renderModal () {
        let modalInfo = {
            className: 'info-delete-modal',
            title: '确定删除所选的内容吗？',
            btns: [
                {name: '确定', bsStyle: 'primary', click: this.ensureDelete},
                {name: '取消', click: this.closeModal}
            ]
        };

        return (<MaskModal ref='MaskModal' showModal={false} modalInfo={modalInfo}></MaskModal>);
    }

    render() {
        var opFun = {
            doDelete: this.doDelete,
            doCheck: this.doCheck
        };
        var tableConfig = globalConfig.tableConfig.draftTable;
        var tableFun = {
            onRowClick: this.onRowClick,
            onRowSelect: this.onRowSelect,
            onSelectAll: this.onSelectAll,
            onPageChange: this.onPageChange
        };
        var tableData = {
            list: this.state.list,
            page: this.option.page || 1,
            total: this.state.total
        };
        var bodyRight, oaUser = util.getOaUser();

        if (oaUser) {
            bodyRight = (
                <div className='body-right'>
                    <ListOps colName='draftManage' opFun={opFun} ref='listOps' />
                    <Table tableConfig={tableConfig} tableFun={tableFun} tableData={tableData} />
                    <Footer />
                </div>
            );
        }
        else {
            bodyRight = (
                <div className='body-right'>
                    <NotLogin />
                    <Footer />
                </div>
            );
        }
        
        return (
            <div className="draft-manage-page page-wrap">
                <Header colName='draftManage'/>
                <div className='draft-manage-body page-body'> 
                    <div className='body-left'>
                        <Navigate colName='draftManage'/>
                    </div>
                    {bodyRight}
                </div>
                {this.renderModal()}
            </div>
        ); 
    }
};

export default DraftManage;

