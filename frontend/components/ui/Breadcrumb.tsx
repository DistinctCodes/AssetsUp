import React from 'react';
import Link from 'next/link';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
    return (
        <nav aria-label="Breadcrumb" className="flex gap-2 text-sm">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={index}>
                        {isLast ? (
                            <span className="text-gray-600 font-medium" aria-current="page">
                                {item.label}
                            </span>
                        ) : (
                            <React.Fragment>
                                <Link
                                    href={item.href || '#'}
                                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                >
                                    {item.label}
                                </Link>
                                <span className="text-gray-400" aria-hidden="true">
                                    /
                                </span>
                            </React.Fragment>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;